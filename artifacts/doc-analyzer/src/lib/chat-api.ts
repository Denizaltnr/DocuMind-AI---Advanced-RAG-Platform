/**
 * DocRAG Chat API Service
 * /api/chat endpoint'ine doğrudan fetch ile istek atar.
 * Tüm hata senaryolarını (network, timeout, API, validation) ayrıştırır.
 */

export type ChatRequestPayload = {
  question: string;
  documentId?: string;
  sessionId?: string;
  topK?: number;
};

export type SourceChunkResult = {
  text: string;
  page: number;
  score: number;
  documentId: string;
  filename: string;
};

export type ChatResult = {
  answer: string;
  sources: SourceChunkResult[];
  sessionId: string;
  question: string;
  historyId: string;
};

export class ChatApiError extends Error {
  constructor(
    message: string,
    public readonly type:
      | "network"
      | "timeout"
      | "validation"
      | "server"
      | "not_found"
      | "unknown",
    public readonly statusCode?: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

const CHAT_URL = "/api/chat";
const TIMEOUT_MS = 60_000;

export async function sendChatMessage(payload: ChatRequestPayload): Promise<ChatResult> {
  if (!payload.question.trim()) {
    throw new ChatApiError("Soru boş olamaz.", "validation");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ChatApiError(
        "İstek zaman aşımına uğradı. Backend yanıt vermiyor.",
        "timeout",
      );
    }
    throw new ChatApiError(
      "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.",
      "network",
    );
  }

  clearTimeout(timer);

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.detail ?? JSON.stringify(body);
    } catch {
      detail = await response.text().catch(() => "");
    }

    if (response.status === 422) {
      throw new ChatApiError(
        "Geçersiz istek: " + detail,
        "validation",
        422,
        detail,
      );
    }
    if (response.status === 404) {
      throw new ChatApiError(
        "Endpoint bulunamadı. Lütfen backend'in çalıştığından emin olun.",
        "not_found",
        404,
        detail,
      );
    }
    if (response.status >= 500) {
      throw new ChatApiError(
        "Sunucu hatası oluştu. Lütfen tekrar deneyin.",
        "server",
        response.status,
        detail,
      );
    }
    throw new ChatApiError(
      `Beklenmeyen hata (${response.status}): ${detail}`,
      "unknown",
      response.status,
      detail,
    );
  }

  try {
    const data: ChatResult = await response.json();
    return data;
  } catch {
    throw new ChatApiError(
      "Sunucudan gelen yanıt işlenemedi.",
      "server",
      200,
    );
  }
}

export async function clearChatSession(sessionId: string): Promise<void> {
  try {
    await fetch("/api/chat/clear-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Non-critical — ignore silently
  }
}

export async function uploadPdf(file: File): Promise<unknown> {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    throw new ChatApiError("Yalnızca PDF dosyaları yüklenebilir.", "validation");
  }

  const MAX_SIZE_MB = 50;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new ChatApiError(
      `Dosya boyutu ${MAX_SIZE_MB} MB'ı aşıyor.`,
      "validation",
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch("/api/py/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ChatApiError("Yükleme zaman aşımına uğradı.", "timeout");
    }
    throw new ChatApiError("Dosya yüklenemedi. Bağlantı hatası.", "network");
  }

  clearTimeout(timer);

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.detail ?? "";
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new ChatApiError(
      detail || "Dosya yüklenirken bir hata oluştu.",
      response.status >= 500 ? "server" : "validation",
      response.status,
      detail,
    );
  }

  return response.json();
}
