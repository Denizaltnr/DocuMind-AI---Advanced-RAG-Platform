import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "node:http";
import router from "./routes";
import authRouter from "./routes/auth";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// How long (ms) to retry ECONNREFUSED while Python is still starting up.
const PYTHON_STARTUP_GRACE_MS = 90_000;
const pythonStartTime = Date.now();

function proxyOnceToPython(
  targetPath: string,
  method: string,
  headers: http.OutgoingHttpHeaders,
  bodyData: Buffer | undefined,
  rawReq: Request,
  res: Response,
  attempt: number,
): void {
  const options: http.RequestOptions = {
    hostname: "localhost",
    port: 8000,
    path: targetPath,
    method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err: NodeJS.ErrnoException) => {
    const isConnRefused = err.code === "ECONNREFUSED" || err.code === "ECONNRESET";
    const withinGrace = Date.now() - pythonStartTime < PYTHON_STARTUP_GRACE_MS;

    if (isConnRefused && withinGrace) {
      const delay = Math.min(500 * attempt, 3000);
      logger.info(
        { attempt, delay },
        "Python backend not ready yet — retrying after delay…",
      );
      setTimeout(() => {
        proxyOnceToPython(targetPath, method, headers, bodyData, rawReq, res, attempt + 1);
      }, delay);
      return;
    }

    logger.error({ err }, "Proxy error to Python backend");
    if (!res.headersSent) {
      res.status(502).json({ error: "Python backend unavailable" });
    }
  });

  if (bodyData) {
    proxyReq.write(bodyData);
    proxyReq.end();
  } else {
    rawReq.pipe(proxyReq, { end: true });
  }
}

function makePythonProxy(targetPathPrefix: string) {
  return (req: Request, res: Response, _next: NextFunction) => {
    const urlSuffix = req.url === "/" ? "" : req.url;
    const targetPath = targetPathPrefix + urlSuffix;

    const forwardBody = ["POST", "PUT", "PATCH"].includes(req.method) && req.body;
    const bodyData = forwardBody ? Buffer.from(JSON.stringify(req.body)) : undefined;

    const headers: http.OutgoingHttpHeaders = {
      ...req.headers,
      host: "localhost:8000",
      "content-type": req.headers["content-type"] || "application/json",
      ...(bodyData ? { "content-length": String(bodyData.length) } : {}),
    };

    proxyOnceToPython(targetPath, req.method, headers, bodyData, req, res, 1);
  };
}

app.use("/api/py", makePythonProxy(""));

// Auth: Node.js handles Google token verification directly (no Python needed).
// Other /api/auth/* routes fall through to the Python proxy below.
app.use("/api/auth", authRouter);
app.use("/api/auth", makePythonProxy("/auth"));

app.use("/api/documents", makePythonProxy("/documents"));
app.use("/api/query", makePythonProxy("/query"));
app.use("/api/chat", makePythonProxy("/chat"));
app.use("/api/history", makePythonProxy("/history"));

app.use("/api", router);

export default app;
