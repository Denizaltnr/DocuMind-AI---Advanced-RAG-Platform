import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDocuments,
  useClearChatSession,
  useListChatSessions,
  useGetSessionMessages,
  useDeleteChatSession,
  getListChatSessionsQueryKey,
} from "@workspace/api-client-react";
import type { SourceChunk, SessionItem } from "@workspace/api-client-react";
import { sendChatMessage, clearChatSession, ChatApiError } from "@/lib/chat-api";
import { Header } from "@/components/header";
import { DocPanel } from "@/components/doc-panel";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import {
  RotateCcw,
  MessageSquare,
  Trash2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/lang-context";
import { motion, AnimatePresence } from "framer-motion";

const SIDEBAR_EXPANDED_W = 272;
const SIDEBAR_COLLAPSED_W = 48;

export default function Home() {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | "all">("all");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessionId, setLoadingSessionId] = useState<string | undefined>();

  const { toast } = useToast();
  const { t } = useLang();
  const queryClient = useQueryClient();

  const { mutate: clearSessionMutation } = useClearChatSession();
  const { data: documents } = useListDocuments();
  const { data: sessions = [], refetch: refetchSessions } = useListChatSessions();

  // Load messages when switching to an existing session
  const { data: loadedMessages } = useGetSessionMessages(loadingSessionId ?? "");

  useEffect(() => {
    if (!loadingSessionId || !loadedMessages) return;
    const mapped: ChatMessage[] = loadedMessages.map(m => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      sources: m.sources as unknown as SourceChunk[] | undefined,
    }));
    setMessages(mapped);
    setSessionId(loadingSessionId);
    setLoadingSessionId(undefined);
  }, [loadedMessages, loadingSessionId]);

  const { mutate: deleteSessionMutation } = useDeleteChatSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
      },
    },
  });

  /* ── Selected doc label ─────────────────────────────── */
  const selectedDocLabel =
    selectedDocId === "all"
      ? t.home.allDocs
      : (documents?.find(d => d.id === selectedDocId)?.filename ?? "");

  /* ── Session helpers ─────────────────────────────────── */
  const resetSession = useCallback((newDocId?: string | "all") => {
    if (sessionId) {
      clearChatSession(sessionId);
      clearSessionMutation({ data: { sessionId } });
    }
    setMessages([]);
    setSessionId(undefined);
    setLoadingSessionId(undefined);
    if (newDocId !== undefined) setSelectedDocId(newDocId);
  }, [sessionId, clearSessionMutation]);

  const handleDocChange = (id: string | "all") => resetSession(id);

  const handleSelectSession = (session: SessionItem) => {
    if (session.id === sessionId) return;
    setMessages([]);
    setSessionId(undefined);
    if (session.documentId) {
      setSelectedDocId(session.documentId);
    }
    setLoadingSessionId(session.id);
  };

  const handleDeleteSession = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    deleteSessionMutation({ sessionId: sid });
    if (sid === sessionId) {
      setMessages([]);
      setSessionId(undefined);
    }
  };

  /* ── Error toast ─────────────────────────────────────── */
  const showErrorToast = (err: ChatApiError) => {
    const errors = t.home.errors as Record<string, string>;
    const title = errors[err.type] ?? errors.unknown;
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
      if (!sessionId) {
        setSessionId(data.sessionId);
        // Refresh session list after first message (title may be generating)
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
        }, 2500);
      } else {
        queryClient.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
      }
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
  }, [question, isSending, selectedDocId, sessionId, queryClient]);

  /* ── Time label ─────────────────────────────────────── */
  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "şimdi";
    if (mins < 60) return `${mins}d önce`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}s önce`;
    return `${Math.floor(hrs / 24)}g önce`;
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      {/* Fixed Header */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      {/* Content area */}
      <div className="flex-1 overflow-hidden pt-14">
        <div className="h-full flex">

          {/* ── Animated Sidebar ──────────────────────────────── */}
          <motion.div
            animate={{ width: sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 flex flex-col overflow-hidden border-r border-border bg-background"
            style={{ willChange: "width" }}
          >
            <div
              className="flex flex-col h-full overflow-hidden"
              style={{ width: SIDEBAR_EXPANDED_W }}
            >
              {/* ── Top: New Chat button ── */}
              <div className="px-4 pt-4 pb-2 shrink-0">
                <button
                  onClick={() => resetSession()}
                  disabled={isSending}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-border bg-white text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-all font-normal"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {t.home.newChat}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* ── Chat History ── */}
              <AnimatePresence>
                {sidebarOpen && sessions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-1 shrink-0"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                      {t.home.chatHistory ?? "Sohbet Geçmişi"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {sidebarOpen && sessions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-2 overflow-y-auto"
                    style={{ maxHeight: "220px" }}
                  >
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className={`group flex items-start gap-2 w-full px-2 py-2 rounded-lg cursor-pointer transition-all mb-0.5 ${
                          session.id === sessionId
                            ? "bg-primary/8 border border-primary/20"
                            : "hover:bg-muted"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate leading-tight">
                            {session.title}
                          </p>
                          {session.documentName && (
                            <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                              {session.documentName}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                            {relativeTime(session.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={e => handleDeleteSession(e, session.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-red-500 transition-all"
                          title="Sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Divider ── */}
              {sidebarOpen && sessions.length > 0 && (
                <div className="mx-4 my-2 border-t border-border/50 shrink-0" />
              )}

              {/* ── DocPanel ── */}
              <div
                className="flex-1 min-h-0 overflow-hidden"
                style={{
                  padding: sidebarOpen ? "4px 16px 16px" : "20px 0 16px",
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

          {/* ── Chat Panel ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0 overflow-hidden px-6 py-6">
            <ChatPanel
              messages={messages}
              isSending={isSending || !!loadingSessionId}
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
