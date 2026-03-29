import { useState, useCallback } from "react";
import { useGetHistory, useClearChatSession, useListDocuments } from "@workspace/api-client-react";
import type { SourceChunk } from "@workspace/api-client-react";
import { sendChatMessage, clearChatSession, ChatApiError } from "@/lib/chat-api";
import { Header } from "@/components/header";
import { DocPanel } from "@/components/doc-panel";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { RotateCcw, WifiOff, ServerCrash, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | "all">("all");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const { toast } = useToast();
  const { data: historyData } = useGetHistory();
  const { mutate: clearSessionMutation } = useClearChatSession();
  const { data: documents } = useListDocuments();

  /* ── Selected doc label ─────────────────────────────── */
  const selectedDocLabel =
    selectedDocId === "all"
      ? "Tüm Belgeler"
      : (documents?.find(d => d.id === selectedDocId)?.filename ?? "");

  /* ── Session helpers ─────────────────────────────────── */
  const resetSession = useCallback((newDocId?: string | "all") => {
    if (sessionId) {
      clearChatSession(sessionId);
      clearSessionMutation({ data: { sessionId } });
    }
    setMessages([]);
    setSessionId(undefined);
    if (newDocId !== undefined) setSelectedDocId(newDocId);
  }, [sessionId, clearSessionMutation]);

  const handleDocChange = (id: string | "all") => resetSession(id);

  /* ── Error toast ─────────────────────────────────────── */
  const showErrorToast = (err: ChatApiError) => {
    const map: Record<string, { title: string }> = {
      network:    { title: "Bağlantı Hatası"    },
      timeout:    { title: "Zaman Aşımı"        },
      server:     { title: "Sunucu Hatası"      },
      validation: { title: "Geçersiz İstek"     },
      not_found:  { title: "Endpoint Bulunamadı"},
      unknown:    { title: "Bilinmeyen Hata"    },
    };
    const { title } = map[err.type] ?? map.unknown;
    toast({ variant: "destructive", title, description: err.message, duration: 6000 });
  };

  /* ── Send ────────────────────────────────────────────── */
  const handleSend = useCallback(async (text?: string) => {
    const q = (text ?? question).trim();
    if (!q || isSending) return;

    setQuestion("");
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: q }]);
    setIsSending(true);

    try {
      const data = await sendChatMessage({
        question: q,
        documentId: selectedDocId === "all" ? undefined : selectedDocId,
        sessionId,
        topK: 5,
      });
      if (!sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        sources: data.sources as unknown as SourceChunk[],
      }]);
    } catch (err) {
      const apiErr = err instanceof ChatApiError
        ? err
        : new ChatApiError("Beklenmeyen bir hata oluştu.", "unknown");
      showErrorToast(apiErr);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**Hata:** ${apiErr.message}`,
        isError: true,
      }]);
    } finally {
      setIsSending(false);
    }
  }, [question, isSending, selectedDocId, sessionId]);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      {/* Fixed Header */}
      <Header />

      {/* Content — below header (14 = h-14) */}
      <div className="flex-1 overflow-hidden pt-14">
        <div className="h-full max-w-5xl mx-auto px-6 py-6 flex gap-6">

          {/* ── Left: Document Panel (1/3) ───────────────── */}
          <div className="w-64 shrink-0 flex flex-col">
            {/* "New chat" mini bar */}
            {messages.length > 0 && (
              <button
                onClick={() => resetSession()}
                disabled={isSending}
                className="flex items-center gap-2 w-full px-3 py-2 mb-4 rounded-2xl border border-border bg-white text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-all font-normal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Yeni Sohbet Başlat
              </button>
            )}
            <DocPanel
              selectedDocId={selectedDocId}
              onDocSelect={handleDocChange}
            />
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-border shrink-0" />

          {/* ── Right: Chat Panel (2/3) ──────────────────── */}
          <div className="flex-1 min-w-0">
            <ChatPanel
              messages={messages}
              isSending={isSending}
              onSend={handleSend}
              question={question}
              onQuestionChange={setQuestion}
              selectedDocLabel={selectedDocLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
