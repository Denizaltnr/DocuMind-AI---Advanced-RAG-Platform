import { useState, useRef, useEffect, useCallback } from "react";
import { useChatWithDocuments, useClearChatSession, useGetHistory } from "@workspace/api-client-react";
import type { SourceChunk } from "@workspace/api-client-react";
import { Sidebar, MobileMenuButton } from "@/components/sidebar";
import { MarkdownMessage } from "@/components/markdown-message";
import {
  Send,
  Loader2,
  Bot,
  User,
  FileText,
  Sparkles,
  RotateCcw,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
};

const SUGGESTIONS = [
  "Bu belgenin ana konusu nedir?",
  "Önemli başlıkları özetle.",
  "Sonuç bölümü ne diyor?",
  "Hangi metodoloji kullanılmış?",
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | "all">("all");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { data: historyData } = useGetHistory();
  const { mutate: sendChat, isPending } = useChatWithDocuments();
  const { mutate: clearSession } = useClearChatSession();

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, isPending, scrollToBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
  };

  const handleNewChat = () => {
    if (sessionId) clearSession({ data: { sessionId } });
    setMessages([]);
    setSessionId(undefined);
    inputRef.current?.focus();
  };

  const handleDocChange = (id: string | "all") => {
    setSelectedDocId(id);
    if (sessionId) clearSession({ data: { sessionId } });
    setMessages([]);
    setSessionId(undefined);
  };

  const handleSend = (text?: string) => {
    const q = (text ?? question).trim();
    if (!q || isPending) return;

    setQuestion("");
    const msgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: msgId, role: "user", content: q }]);

    sendChat(
      {
        data: {
          question: q,
          documentId: selectedDocId === "all" ? undefined : selectedDocId,
          sessionId,
        },
      },
      {
        onSuccess: (data) => {
          if (!sessionId) setSessionId(data.sessionId);
          setMessages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.answer,
              sources: data.sources,
            },
          ]);
        },
        onError: () => {
          setMessages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
            },
          ]);
          toast({ variant: "destructive", title: "Bağlantı hatası", description: "Backend'e ulaşılamadı." });
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const toggleSources = (msgId: string) => {
    setSourcesOpen(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const recentChats = (historyData ?? []).slice(0, 10).map(h => ({
    id: h.id,
    question: h.question,
    createdAt: h.createdAt,
  }));

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        selectedDocId={selectedDocId}
        onDocSelect={handleDocChange}
        onNewChat={handleNewChat}
        recentChats={recentChats}
        onSelectHistory={(q) => { handleNewChat(); setTimeout(() => handleSend(q), 50); }}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-screen">

        {/* Top Bar */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-background/80 backdrop-blur-sm">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">
                {selectedDocId === "all" ? "Tüm Belgeler" : "Seçili Belge"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {isPending ? "Yanıt oluşturuluyor..." : "Hazır"}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Sıfırla
            </button>
          )}
        </header>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/30 to-indigo-500/30 border border-white/10 flex items-center justify-center mb-6 shadow-2xl shadow-primary/10">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">DocRAG'a Hoş Geldiniz</h2>
              <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
                Belgeleriniz hakkında sorular sorun. Yapay zeka, belgelerdeki bilgilere dayanarak doğru ve kaynaklı yanıtlar üretir.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-card/60 border border-white/8 hover:border-primary/30 hover:bg-primary/5 text-left text-sm text-muted-foreground hover:text-foreground transition-all group"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary shrink-0" />
                    <span className="text-xs">{s}</span>
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
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" && "flex-row-reverse"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-1",
                      msg.role === "user"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-indigo-500/20 border border-indigo-400/30 text-indigo-300"
                    )}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                      "max-w-[78%] space-y-2",
                      msg.role === "user" ? "items-end" : "items-start",
                      "flex flex-col"
                    )}>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-sm shadow-lg shadow-primary/20"
                          : "bg-card/70 border border-white/8 text-foreground rounded-tl-sm backdrop-blur-sm"
                      )}>
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        ) : (
                          <MarkdownMessage content={msg.content} />
                        )}
                      </div>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="w-full">
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                          >
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span>{msg.sources.length} kaynak kullanıldı</span>
                            <ChevronDown className={cn("w-3 h-3 transition-transform", sourcesOpen[msg.id] && "rotate-180")} />
                          </button>

                          <AnimatePresence>
                            {sourcesOpen[msg.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 space-y-1.5">
                                  {msg.sources.map((src, i) => (
                                    <div
                                      key={i}
                                      className="bg-card/50 border border-white/8 rounded-xl px-3 py-2.5 space-y-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-primary shrink-0" />
                                        <span className="text-xs font-medium text-foreground truncate">{src.filename}</span>
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                                          Sayfa {src.page}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
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

                {/* Thinking indicator */}
                {isPending && (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div className="bg-card/70 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground mr-1">Yanıt oluşturuluyor</span>
                        <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                        <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Scroll to bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-28 right-6 w-9 h-9 rounded-full bg-card border border-white/10 shadow-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/5 bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className={cn(
              "flex items-end gap-2 bg-card/60 border rounded-2xl px-4 py-3 backdrop-blur-sm transition-all shadow-xl",
              "border-white/10 focus-within:border-primary/40 focus-within:shadow-primary/10"
            )}>
              <textarea
                ref={inputRef}
                value={question}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="Belgeler hakkında bir şey sorun… (Shift+Enter yeni satır)"
                rows={1}
                disabled={isPending}
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/60 max-h-40 leading-relaxed disabled:opacity-60"
                style={{ height: "auto" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!question.trim() || isPending}
                className="shrink-0 w-9 h-9 rounded-xl bg-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 text-white flex items-center justify-center transition-all"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground/40 mt-2">
              DocRAG yalnızca yüklenen belgelere dayanarak yanıt verir · AI yanıtları doğrulama gerektirebilir
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
