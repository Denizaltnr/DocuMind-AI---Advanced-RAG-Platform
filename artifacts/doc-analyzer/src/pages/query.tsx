import { Layout } from "@/components/layout";
import { useState, useRef, useEffect } from "react";
import { useQueryDocument, useListDocuments } from "@workspace/api-client-react";
import type { QueryResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { Send, Sparkles, Bot, User, ChevronRight, FileText, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Query() {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | "all">("all");
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string, sources?: QueryResponse['sources']}>>([]);
  
  const { data: documents } = useListDocuments();
  const { mutate: askQuery, isPending } = useQueryDocument();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isPending) return;

    const currentQ = question;
    setQuestion("");
    setChatHistory(prev => [...prev, { role: 'user', content: currentQ }]);

    askQuery(
      { 
        data: { 
          question: currentQ, 
          documentId: selectedDocId === "all" ? undefined : selectedDocId 
        } 
      },
      {
        onSuccess: (data) => {
          setChatHistory(prev => [...prev, { 
            role: 'assistant', 
            content: data.answer,
            sources: data.sources
          }]);
        },
        onError: () => {
          setChatHistory(prev => [...prev, { 
            role: 'assistant', 
            content: "Üzgünüm, sorunuza yanıt verirken bir hata oluştu." 
          }]);
        }
      }
    );
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] max-w-4xl mx-auto">
        
        {/* Header Options */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-display font-semibold">AI Asistanı</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Kaynak:</span>
            <select 
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-card border border-border text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
            >
              <option value="all">Tüm Belgeler</option>
              {documents?.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.filename}</option>
              ))}
            </select>
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
                className="w-48 h-48 object-cover mb-8 rounded-3xl mix-blend-screen opacity-50"
              />
              <h3 className="text-2xl font-display font-medium mb-2">Nasıl yardımcı olabilirim?</h3>
              <p className="text-muted-foreground max-w-md">
                Yüklediğiniz belgeler hakkında istediğiniz soruyu sorun. AI, bağlamı anlayarak size kaynaklarıyla birlikte yanıt verecektir.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {chatHistory.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  
                  <div className={`space-y-3 ${msg.role === 'user' ? 'items-end' : ''}`}>
                    <div className={`p-4 rounded-2xl text-[15px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-card border border-border/50 text-foreground rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>

                    {/* Sources Section */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pl-2 pr-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          Kaynaklar:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, sIdx) => (
                            <div 
                              key={sIdx} 
                              className="group relative flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors cursor-help"
                            >
                              <FileText className="w-3 h-3 text-primary" />
                              <span className="truncate max-w-[120px]">{source.filename}</span>
                              <span className="text-muted-foreground bg-black/20 px-1 rounded">S.{source.page}</span>
                              
                              {/* Source tooltip on hover */}
                              <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                <p className="text-xs leading-relaxed text-popover-foreground line-clamp-6">"{source.text}"</p>
                                <div className="mt-2 text-[10px] text-primary flex justify-between">
                                  <span>Alaka Skoru: {(source.score * 100).toFixed(1)}%</span>
                                </div>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}/>
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}/>
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}/>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 pt-4">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-2xl blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity duration-500" />
            <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-lg">
              <input 
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Belgelerde ne aramak istersiniz?"
                className="flex-1 bg-transparent border-none py-4 px-6 text-foreground placeholder:text-muted-foreground outline-none w-full"
                disabled={isPending}
              />
              <button 
                type="submit"
                disabled={!question.trim() || isPending}
                className="mr-2 p-3 bg-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
          <div className="text-center mt-3 text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" /> AI yanıtları her zaman doğru olmayabilir, lütfen kaynakları doğrulayın.
          </div>
        </div>

      </div>
    </Layout>
  );
}
