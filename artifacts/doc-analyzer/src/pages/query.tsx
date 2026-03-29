import { Layout } from "@/components/layout";
import { useState, useRef, useEffect } from "react";
import { useChatWithDocuments, useClearChatSession, useListDocuments } from "@workspace/api-client-react";
import type { ChatResponse, SourceChunk } from "@workspace/api-client-react";
import { Send, Sparkles, Bot, User, FileText, Loader2, CheckCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
};

export default function Query() {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | "all">("all");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const { data: documents } = useListDocuments();
  const { mutate: sendChat, isPending } = useChatWithDocuments();
  const { mutate: clearSession } = useClearChatSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isPending) return;

    const currentQ = question.trim();
    setQuestion("");
    setChatHistory(prev => [...prev, { role: "user", content: currentQ }]);

    sendChat(
      {
        data: {
          question: currentQ,
          documentId: selectedDocId === "all" ? undefined : selectedDocId,
          sessionId: sessionId,
        },
      },
      {
        onSuccess: (data) => {
          if (!sessionId) setSessionId(data.sessionId);
          setChatHistory(prev => [
            ...prev,
            {
              role: "assistant",
              content: data.answer,
              sources: data.sources,
            },
          ]);
        },
        onError: () => {
          setChatHistory(prev => [
            ...prev,
            {
              role: "assistant",
              content: "Üzgünüm, sorunuza yanıt verirken bir hata oluştu. Lütfen tekrar deneyin.",
            },
          ]);
        },
      }
    );
  };

  const handleClearConversation = () => {
    if (sessionId) {
      clearSession(
        { data: { sessionId } },
        {
          onSuccess: () => {
            toast({ title: "Sohbet temizlendi", description: "Konuşma geçmişi sıfırlandı." });
          },
        }
      );
    }
    setChatHistory([]);
    setSessionId(undefined);
    inputRef.current?.focus();
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDocId(e.target.value);
    if (sessionId) {
      clearSession({ data: { sessionId } });
    }
    setChatHistory([]);
    setSessionId(undefined);
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">AI Sohbet</h1>
              <p className="text-xs text-muted-foreground">Konuşma geçmişini hatırlayan akıllı asistan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Kaynak:</span>
            <select
              value={selectedDocId}
              onChange={handleDocChange}
              className="bg-card border border-border text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
            >
              <option value="all">Tüm Belgeler</option>
              {documents?.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.filename}</option>
              ))}
            </select>

            {chatHistory.length > 0 && (
              <button
                onClick={handleClearConversation}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                title="Sohbeti Temizle"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Temizle</span>
              </button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-3xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 md:p-6 space-y-6 scroll-smooth"
        >
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-70">
              <img
                src={`${import.meta.env.BASE_URL}images/empty-state.png`}
                alt="AI Ready"
                className="w-40 h-40 object-cover mb-8 rounded-3xl mix-blend-screen opacity-50"
              />
              <h3 className="text-2xl font-bold mb-2">Nasıl yardımcı olabilirim?</h3>
              <p className="text-muted-foreground max-w-md text-sm">
                Yüklediğiniz belgeler hakkında istediğiniz soruyu sorun. Asistan konuşma geçmişinizi hatırlayarak bağlantılı sorulara cevap verir.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {["Bu belgenin ana konusu nedir?", "Önemli başlıkları özetle.", "Sonuç bölümü ne diyor?"].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {chatHistory.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "ml-auto flex-row-reverse max-w-[80%]" : "max-w-[90%]"}`}
                >
                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="space-y-2 min-w-0">
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border/60 text-foreground rounded-tl-sm shadow-sm"
                    }`}>
                      {msg.content}
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pl-1">
                        <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {msg.sources.length} kaynak kullanıldı
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((source, sIdx) => (
                            <div
                              key={sIdx}
                              className="group relative flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors cursor-help"
                            >
                              <FileText className="w-3 h-3 text-primary shrink-0" />
                              <span className="truncate max-w-[100px]">{source.filename}</span>
                              <span className="text-muted-foreground bg-black/20 px-1 rounded text-[10px]">S.{source.page}</span>

                              <div className="absolute bottom-full left-0 mb-2 w-72 bg-popover border border-border p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                <p className="text-xs leading-relaxed text-popover-foreground line-clamp-6">
                                  &ldquo;{source.text}&rdquo;
                                </p>
                                {source.score > 0 && (
                                  <div className="mt-2 text-[10px] text-primary">
                                    Alaka skoru: {(source.score * 100).toFixed(1)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Yanıt oluşturuluyor</span>
                    <div className="flex gap-1 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 pt-4">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-lg">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Belgeler hakkında bir soru sorun…"
                className="flex-1 bg-transparent border-none py-4 px-5 text-foreground placeholder:text-muted-foreground outline-none text-sm"
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!question.trim() || isPending}
                className="mr-2 p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
          <div className="text-center mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            Asistan konuşma geçmişinizi oturum boyunca hatırlar · AI yanıtları doğrulama gerektirebilir
          </div>
        </div>
      </div>
    </Layout>
  );
}
