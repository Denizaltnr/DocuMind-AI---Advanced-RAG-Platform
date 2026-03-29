import { spawn, execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function findPython(): string {
  const candidates = [
    path.join(process.cwd(), ".pythonlibs", "bin", "python3"),
    "/home/runner/workspace/.pythonlibs/bin/python3",
    "/usr/local/bin/python3",
    "/usr/bin/python3",
    "python3",
  ];
  for (const p of candidates) {
    if (p === "python3" || fs.existsSync(p)) return p;
  }
  return "python3";
}

function installPythonDeps(backendDir: string) {
  const reqFile = path.join(backendDir, "requirements.txt");
  if (!fs.existsSync(reqFile)) return;
  logger.info("Installing Python backend dependencies…");
  try {
    const pythonBin = findPython();
    execSync(`${pythonBin} -m pip install -q -r ${reqFile}`, { stdio: "inherit" });
    logger.info("Python dependencies installed.");
  } catch (e) {
    logger.warn({ e }, "pip install failed — will try with existing packages");
  }
}

function startPythonBackend() {
  const backendDir = path.resolve(process.cwd(), "backend");

  if (!fs.existsSync(backendDir)) {
    logger.error({ backendDir }, "backend/ directory not found — cannot start Python backend");
    return;
  }

  // Always install deps so new requirements.txt entries are picked up on every deploy
  installPythonDeps(backendDir);

  const pythonBin = findPython();
  logger.info({ backendDir, pythonBin }, "Starting Python backend via python3 -u -m uvicorn");

  // Use "python3 -u -m uvicorn" instead of the uvicorn binary.
  // -u forces unbuffered stdout/stderr so logs reach us immediately.
  // This also avoids shebang path issues with the uvicorn binary in production.
  const proc = spawn(
    pythonBin,
    ["-u", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
    {
      cwd: backendDir,
      stdio: "pipe",
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        ANONYMIZED_TELEMETRY: "false",
        CHROMA_TELEMETRY: "false",
      },
    },
  );

  proc.stdout?.on("data", (d: Buffer) => {
    const line = d.toString().trim();
    if (line) logger.info({ source: "python" }, line);
  });

  proc.stderr?.on("data", (d: Buffer) => {
    const line = d.toString().trim();
    if (line) logger.info({ source: "python" }, line);
  });

  proc.on("exit", (code, signal) => {
    logger.warn({ code, signal }, "Python backend exited — restarting in 3s");
    setTimeout(startPythonBackend, 3000);
  });

  proc.on("error", (err) => {
    logger.error({ err }, "Failed to start Python backend — retrying in 5s");
    installPythonDeps(backendDir);
    setTimeout(startPythonBackend, 5000);
  });
}

const isDev = process.env["NODE_ENV"] === "development";

if (!isDev) {
  startPythonBackend();
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
