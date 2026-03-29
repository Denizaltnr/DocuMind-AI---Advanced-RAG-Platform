import { useState, useCallback } from "react";
import { useGetHistory, useClearChatSession, useListDocuments } from "@workspace/api-client-react";
import type { SourceChunk } from "@workspace/api-client-react";
import { sendChatMessage, clearChatSession, ChatApiError } from "@/lib/chat-api";
import { Header } from "@/components/header";
import { DocPanel } from "@/components/doc-panel";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { RotateCcw, WifiOff, ServerCrash, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const SIDEBAR_EXPANDED_W = 256;
const SIDEBAR_COLLAPSED_W = 48;

export default function Home() {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | "all">("all");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      {/* Fixed Header — carries the sidebar toggle */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      {/* Content area — below fixed header */}
      <div className="flex-1 overflow-hidden pt-14">
        <div className="h-full flex">

          {/* ── Animated Sidebar ──────────────────────────────── */}
          <motion.div
            animate={{ width: sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 flex flex-col overflow-hidden border-r border-border bg-background"
            style={{ willChange: "width" }}
          >
            {/* Inner wrapper — fixed size so content doesn't reflow during animation */}
            <div
              className="flex flex-col h-full overflow-hidden"
              style={{ width: SIDEBAR_EXPANDED_W }}
            >
              {/* "New chat" mini bar — only in expanded mode */}
              <AnimatePresence>
                {sidebarOpen && messages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pt-5 pb-0"
                  >
                    <button
                      onClick={() => resetSession()}
                      disabled={isSending}
                      className="flex items-center gap-2 w-full px-3 py-2 mb-4 rounded-2xl border border-border bg-white text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-all font-normal"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      Yeni Sohbet Başlat
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* DocPanel — fills remaining height, handles its own collapsed view */}
              <div
                className="flex-1 overflow-hidden"
                style={{
                  padding: sidebarOpen ? "20px 16px 16px" : "20px 0 16px",
                  transition: "padding 0.28s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                <DocPanel
                  selectedDocId={selectedDocId}
                  onDocSelect={handleDocChange}
                  collapsed={!sidebarOpen}
                />
              </div>
            </div>
          </motion.div>

          {/* ── Chat Panel — grows automatically ─────────────── */}
          <div className="flex-1 min-w-0 overflow-hidden px-6 py-6">
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
