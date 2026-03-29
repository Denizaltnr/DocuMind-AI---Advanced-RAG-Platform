import { useState, useRef, useEffect, useCallback } from "react";
import { useGetHistory, useClearChatSession } from "@workspace/api-client-react";
import type { SourceChunk } from "@workspace/api-client-react";
import { sendChatMessage, clearChatSession, ChatApiError } from "@/lib/chat-api";
import { Sidebar, MobileMenuButton } from "@/components/sidebar";
import { MarkdownMessage } from "@/components/markdown-message";
import {
  Send,
  Loader2,
  Bot,
  User,
  FileText,
  RotateCcw,
  ChevronDown,
  WifiOff,
  ServerCrash,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  isError?: boolean;
};

const SUGGESTIONS = [
  { label: "Ana konuyu özetle", icon: Sparkles },
  { label: "Önemli başlıkları listele", icon: FileText },
  { label: "Sonuç bölümü ne diyor?", icon: ArrowUpRight },
  { label: "Hangi metodoloji kullanılmış?", icon: ArrowUpRight },
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | "all">("all");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { data: historyData } = useGetHistory();
  const { mutate: clearSessionMutation } = useClearChatSession();

  /* ── scroll helpers ────────────────────────────────────── */
  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0 || isSending) scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
  };

  /* ── session management ────────────────────────────────── */
  const resetSession = (newDocId?: string | "all") => {
    if (sessionId) {
      clearChatSession(sessionId);
      clearSessionMutation({ data: { sessionId } });
    }
    setMessages([]);
    setSessionId(undefined);
    if (newDocId !== undefined) setSelectedDocId(newDocId);
  };

  const handleNewChat = () => { resetSession(); inputRef.current?.focus(); };
  const handleDocChange = (id: string | "all") => resetSession(id);

  /* ── error toast ───────────────────────────────────────── */
  const showErrorToast = (err: ChatApiError) => {
    const map: Record<string, { title: string; Icon: typeof WifiOff }> = {
      network:    { title: "Bağlantı Hatası",      Icon: WifiOff },
      timeout:    { title: "Zaman Aşımı",           Icon: Clock },
      server:     { title: "Sunucu Hatası",         Icon: ServerCrash },
      validation: { title: "Geçersiz İstek",        Icon: AlertTriangle },
      not_found:  { title: "Endpoint Bulunamadı",   Icon: ServerCrash },
      unknown:    { title: "Bilinmeyen Hata",       Icon: AlertTriangle },
    };
    const { title } = map[err.type] ?? map.unknown;
    toast({ variant: "destructive", title, description: err.message, duration: 6000 });
  };

  /* ── send message ──────────────────────────────────────── */
  const handleSend = async (text?: string) => {
    const q = (text ?? question).trim();
    if (!q || isSending) return;

    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";

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
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          sources: data.sources as unknown as SourceChunk[],
        },
      ]);
    } catch (err) {
      const apiErr = err instanceof ChatApiError
        ? err
        : new ChatApiError("Beklenmeyen bir hata oluştu.", "unknown");
      showErrorToast(apiErr);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `**Hata:** ${apiErr.message}`,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const recentChats = (historyData ?? []).slice(0, 10).map(h => ({
    id: h.id, question: h.question, createdAt: h.createdAt,
  }));

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        selectedDocId={selectedDocId}
        onDocSelect={handleDocChange}
        onNewChat={handleNewChat}
        recentChats={recentChats}
        onSelectHistory={(q) => { handleNewChat(); setTimeout(() => handleSend(q), 80); }}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main panel ─────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-screen relative bg-background">

        {/* Top bar */}
        <header className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-border bg-white">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {selectedDocId === "all" ? "Tüm Belgeler" : "Seçili Belge"}
            </h1>
            <p className={cn(
              "text-xs transition-colors hidden sm:block",
              isSending ? "text-primary font-medium" : "text-muted-foreground font-normal"
            )}>
              {isSending ? "AI yazıyor..." : "Hazır"}
            </p>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              disabled={isSending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border border-border text-muted-foreground bg-white hover:bg-muted hover:text-foreground disabled:opacity-40 transition-all font-normal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Yeni Sohbet
            </button>
          )}
        </header>

        {/* ── Chat scroll area ──────────────────────────────── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {isEmpty ? (
            /* Welcome / empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
              <div className="w-16 h-16 rounded-2xl bg-accent border border-primary/20 flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-primary" />
              </div>

              <h2 className="text-2xl font-semibold text-foreground mb-2">
                DocRAG&apos;a Hoş Geldiniz
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed font-normal">
                Belgeleriniz hakkında sorular sorun. Yapay zeka, yüklenen kaynaklara dayanarak doğru ve şeffaf yanıtlar üretir.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => handleSend(label)}
                    disabled={isSending}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-border hover:border-primary/30 hover:bg-accent text-left text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                  >
                    <Icon className="w-3.5 h-3.5 text-primary/50 group-hover:text-primary shrink-0 transition-colors" />
                    <span className="text-xs font-normal">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              <AnimatePresence initial={false}>

                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-2xl shrink-0 flex items-center justify-center mt-0.5 border",
                      msg.role === "user"
                        ? "bg-primary border-primary/20 text-white shadow-sm shadow-primary/20"
                        : msg.isError
                        ? "bg-red-50 border-red-200 text-red-500"
                        : "bg-white border-border text-muted-foreground"
                    )}>
                      {msg.role === "user"
                        ? <User className="w-3.5 h-3.5" />
                        : msg.isError
                        ? <AlertTriangle className="w-3.5 h-3.5" />
                        : <Bot className="w-3.5 h-3.5" />
                      }
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                      "max-w-[78%] flex flex-col space-y-2",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-md shadow-sm shadow-primary/15"
                          : msg.isError
                          ? "bg-red-50 border border-red-200 text-red-700 rounded-tl-md"
                          : "bg-white border border-border text-foreground rounded-tl-md shadow-sm"
                      )}>
                        {msg.role === "user"
                          ? <p className="whitespace-pre-wrap break-words font-normal">{msg.content}</p>
                          : <MarkdownMessage content={msg.content} isError={msg.isError} />
                        }
                      </div>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && !msg.isError && (
                        <div className="w-full">
                          <button
                            onClick={() => setSourcesOpen(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 font-normal"
                          >
                            <FileText className="w-3 h-3 text-primary/70" />
                            <span>{msg.sources.length} kaynak</span>
                            <ChevronDown className={cn(
                              "w-3 h-3 transition-transform duration-200",
                              sourcesOpen[msg.id] && "rotate-180"
                            )} />
                          </button>

                          <AnimatePresence>
                            {sourcesOpen[msg.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 space-y-1.5">
                                  {msg.sources.map((src, i) => (
                                    <div
                                      key={i}
                                      className="bg-white border border-border rounded-2xl px-4 py-3 space-y-1.5 shadow-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-primary shrink-0" />
                                        <span className="text-xs font-medium text-foreground truncate">
                                          {src.filename}
                                        </span>
                                        <span className="ml-auto text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0 font-normal">
                                          Sayfa {src.page}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-normal">
                                        {src.text}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* AI yazıyor... */}
                {isSending && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-2xl bg-white border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="bg-white border border-border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:160ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:320ms]" />
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">AI yazıyor...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Scroll to bottom pill */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pl-3 pr-4 py-1.5 rounded-full bg-white border border-border shadow-md text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all z-10 font-normal"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Aşağı git
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Input bar ────────────────────────────────────── */}
        <div className="shrink-0 px-4 pb-5 pt-3 border-t border-border bg-white">
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              "flex items-end gap-2 bg-background border rounded-2xl px-4 py-3 transition-all input-ring",
              isSending ? "border-primary/30" : "border-border"
            )}>
              <textarea
                ref={inputRef}
                value={question}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder={
                  isSending
                    ? "AI yanıt oluşturuyor..."
                    : "Belgeler hakkında bir şey sorun…"
                }
                rows={1}
                disabled={isSending}
                className="flex-1 bg-transparent outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground max-h-40 leading-relaxed disabled:cursor-wait font-normal"
                style={{ height: "auto", border: "none" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!question.trim() || isSending}
                aria-label="Gönder"
                className={cn(
                  "shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center transition-all",
                  "bg-primary text-white",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "hover:bg-primary/90 btn-glow"
                )}
              >
                {isSending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-2 font-normal">
              {isSending
                ? "Belge analiz ediliyor, bu birkaç saniye sürebilir..."
                : "DocRAG yalnızca yüklenen belgeler üzerinden yanıt verir · AI yanıtları doğrulama gerektirebilir"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
