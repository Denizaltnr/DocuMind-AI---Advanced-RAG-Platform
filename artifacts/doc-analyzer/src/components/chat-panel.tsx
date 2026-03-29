import { useRef, useEffect, useCallback, useState } from "react";
import type { SourceChunk } from "@workspace/api-client-react";
import { MarkdownMessage } from "@/components/markdown-message";
import {
  Send,
  Loader2,
  FileText,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  isError?: boolean;
};

const SUGGESTIONS = [
  "Bu belgenin ana konusu nedir?",
  "Önemli başlıkları listele",
  "Sonuç bölümünü özetle",
  "Hangi metodoloji kullanılmış?",
];

interface ChatPanelProps {
  messages: ChatMessage[];
  isSending: boolean;
  onSend: (text?: string) => void;
  question: string;
  onQuestionChange: (val: string) => void;
  selectedDocLabel: string;
}

export function ChatPanel({
  messages,
  isSending,
  onSend,
  question,
  onQuestionChange,
  selectedDocLabel,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState<Record<string, boolean>>({});

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
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onQuestionChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 148) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel label */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Sohbet
        </h2>
        {selectedDocLabel && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground font-normal truncate max-w-[160px]">
              {selectedDocLabel}
            </span>
          </>
        )}
        {isSending && (
          <span className="ml-auto text-[11px] text-primary font-medium animate-pulse flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary inline-block animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-primary/70 inline-block animate-bounce [animation-delay:160ms]" />
            AI yazıyor...
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent border border-primary/20 flex items-center justify-center mb-5">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              Sormaya Hazır
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs font-normal leading-relaxed mb-7">
              Yüklenen belge hakkında istediğiniz soruyu sorun.
            </p>
            <div className="grid grid-cols-1 gap-1.5 w-full max-w-xs">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  disabled={isSending}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-border hover:border-primary/25 hover:bg-accent text-left transition-all group disabled:opacity-50"
                >
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground font-normal">{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list — Notion style */
          <div className="space-y-1 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Date separator on first message */}
                  {idx === 0 && (
                    <div className="flex items-center gap-3 py-3 mb-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest">
                        {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className={cn(
                    "flex gap-3 px-1 py-2 rounded-2xl transition-colors group",
                    "hover:bg-muted/50"
                  )}>
                    {/* Icon / Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {msg.role === "user" ? (
                        <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
                          <span className="text-[10px] font-semibold text-white leading-none">S</span>
                        </div>
                      ) : msg.isError ? (
                        <div className="w-6 h-6 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-accent border border-primary/20 flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Role label */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={cn(
                          "text-xs font-semibold",
                          msg.role === "user" ? "text-foreground" : msg.isError ? "text-red-600" : "text-primary"
                        )}>
                          {msg.role === "user" ? "Siz" : msg.isError ? "Hata" : "DocuMind AI"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Message body */}
                      {msg.role === "user" ? (
                        <p className="text-sm text-foreground font-normal leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      ) : (
                        <MarkdownMessage content={msg.content} isError={msg.isError} />
                      )}

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && !msg.isError && (
                        <div className="mt-3">
                          <button
                            onClick={() => setSourcesOpen(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-normal"
                          >
                            <FileText className="w-3 h-3 text-primary/60" />
                            <span>{msg.sources.length} kaynaktan yanıtlandı</span>
                            <ChevronDown className={cn(
                              "w-3 h-3 transition-transform duration-150",
                              sourcesOpen[msg.id] && "rotate-180"
                            )} />
                          </button>

                          <AnimatePresence>
                            {sourcesOpen[msg.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 space-y-1.5 pl-1">
                                  {msg.sources.map((src, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2.5 bg-white border border-border rounded-2xl px-3 py-2.5"
                                    >
                                      <FileText className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[11px] font-medium text-foreground truncate">
                                            {src.filename}
                                          </span>
                                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0 font-normal">
                                            Sayfa {src.page}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5 font-normal">
                                          {src.text}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* AI yazıyor — Skeleton loader */}
              {isSending && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3 px-1 py-2 rounded-2xl"
                >
                  <div className="w-6 h-6 rounded-lg bg-accent border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 pt-0.5 min-w-0">
                    <div className="flex items-baseline gap-2 mb-2.5">
                      <span className="text-xs font-semibold text-primary">DocuMind AI</span>
                    </div>
                    <div className="space-y-2">
                      <div className="skeleton-line h-3 w-full rounded-full" />
                      <div className="skeleton-line h-3 w-4/5 rounded-full" />
                      <div className="skeleton-line h-3 w-2/3 rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Scroll button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pl-3 pr-3.5 py-1.5 rounded-full bg-white border border-border shadow-md text-xs text-muted-foreground hover:text-foreground transition-all font-normal"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Aşağı git
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ────────────────────────────────────────── */}
      <div className="shrink-0 pt-3">
        <div className={cn(
          "flex items-end gap-2 bg-white border rounded-2xl px-4 py-3 shadow-sm",
          "transition-all duration-200",
          "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 focus-within:shadow-md",
          isSending ? "border-primary/30" : "border-border"
        )}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder={isSending ? "AI yanıt oluşturuyor..." : "Bir şey sorun… (Shift+Enter yeni satır)"}
            rows={1}
            disabled={isSending}
            className="flex-1 bg-transparent outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground max-h-36 leading-relaxed disabled:cursor-wait font-normal"
            style={{ height: "auto", border: "none" }}
          />
          <button
            onClick={() => onSend()}
            disabled={!question.trim() || isSending}
            aria-label="Gönder"
            className={cn(
              "shrink-0 w-8 h-8 rounded-2xl bg-primary text-white flex items-center justify-center",
              "transition-all duration-200 ease-out",
              "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90",
              "active:translate-y-0 active:shadow-md",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            )}
          >
            {isSending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center font-normal">
          DocuMind AI yalnızca yüklenen belgeler üzerinden yanıt verir
        </p>
      </div>
    </div>
  );
}
