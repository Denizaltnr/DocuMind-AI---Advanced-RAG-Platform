import { Layout } from "@/components/layout";
import { useGetHistory, useClearHistory, getGetHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { History as HistoryIcon, Trash2, ChevronDown, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function History() {
  const { data: historyItems, isLoading } = useGetHistory();
  const { mutate: clearHistory, isPending: isClearing } = useClearHistory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleClearAll = () => {
    if (confirm("Tüm geçmişi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      clearHistory(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
          toast({ title: "Başarılı", description: "Geçmiş temizlendi." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Hata", description: "İşlem başarısız oldu." });
        }
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <HistoryIcon className="w-6 h-6 text-indigo-400" />
              </div>
              Sorgu Geçmişi
            </h1>
            <p className="text-muted-foreground mt-2 pl-1">Önceki aramalarınız ve yapay zeka yanıtları.</p>
          </div>
          
          <Button 
            variant="outline" 
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
            onClick={handleClearAll}
            disabled={isClearing || !historyItems?.length}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Geçmişi Temizle
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-card/50 rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : historyItems?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card/30">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">Kayıt Bulunamadı</h3>
            <p className="text-muted-foreground">Henüz herhangi bir sorgu yapmamışsınız.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyItems?.map((item) => {
              const isExpanded = expandedId === item.id;
              
              return (
                <motion.div 
                  key={item.id}
                  layout
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <div 
                    className="p-5 cursor-pointer flex items-start gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex-1 space-y-2">
                      <h3 className="font-medium text-lg leading-snug">"{item.question}"</h3>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(item.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
                        </span>
                        {item.documentName && (
                          <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded">
                            Belge: {item.documentName}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button className={`p-2 rounded-full bg-white/5 transition-transform duration-300 ${isExpanded ? "rotate-180 bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/10"}`}>
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border bg-black/20"
                      >
                        <div className="p-5 space-y-6">
                          <div>
                            <div className="text-xs font-semibold tracking-wider text-primary uppercase mb-2">AI Yanıtı</div>
                            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                              {item.answer}
                            </p>
                          </div>
                          
                          {item.sources && item.sources.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">Kullanılan Kaynaklar</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {item.sources.map((source, idx) => (
                                  <div key={idx} className="bg-card border border-white/5 p-3 rounded-xl text-xs space-y-2">
                                    <div className="flex justify-between items-center text-muted-foreground mb-1">
                                      <span className="truncate pr-2 font-medium text-foreground/70">{source.filename}</span>
                                      <span className="shrink-0 bg-white/10 px-1.5 rounded">Sayfa {source.page}</span>
                                    </div>
                                    <p className="line-clamp-4 text-muted-foreground italic">"{source.text}"</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
