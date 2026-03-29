import { useState, useRef } from "react";
import { useListDocuments, useDeleteDocument } from "@workspace/api-client-react";
import { useUploadDocument } from "@/hooks/use-upload";
import {
  Plus,
  FileText,
  Upload,
  Loader2,
  Trash2,
  ChevronLeft,
  Menu,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type HistoryItem = {
  id: string;
  question: string;
  createdAt: string;
};

interface SidebarProps {
  selectedDocId: string | "all";
  onDocSelect: (id: string | "all") => void;
  onNewChat: () => void;
  recentChats: HistoryItem[];
  onSelectHistory: (question: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  selectedDocId,
  onDocSelect,
  onNewChat,
  recentChats,
  onSelectHistory,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { data: documents, isLoading: docsLoading } = useListDocuments();
  const { mutate: deleteDoc } = useDeleteDocument();
  const { mutate: uploadDoc, isPending: uploading } = useUploadDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "Sadece PDF desteklenir." });
      return;
    }
    uploadDoc(file);
    e.target.value = "";
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    deleteDoc(
      { id },
      {
        onSettled: () => setDeletingId(null),
        onSuccess: () => {
          if (selectedDocId === id) onDocSelect("all");
        },
      }
    );
  };

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-white text-lg leading-none">DocRAG</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">AI Belge Analizi</p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => { onNewChat(); onMobileClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Yeni Sohbet
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-5 scrollbar-thin">

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5"><History className="w-3 h-3" /> Son Sohbetler</span>
              <ChevronLeft className={cn("w-3 h-3 transition-transform", showHistory ? "-rotate-90" : "rotate-90")} />
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 mt-1">
                    {recentChats.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { onSelectHistory(item.question); onMobileClose(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                        <span className="truncate">{item.question}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Documents */}
        <div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Belgeler
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? "Yükleniyor..." : "Yükle"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={cn(
              "mx-1 mb-3 border border-dashed border-white/10 rounded-xl p-3 text-center cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5",
              uploading && "pointer-events-none opacity-70"
            )}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <Upload className="w-3.5 h-3.5 text-primary absolute inset-0 m-auto" />
                </div>
                <span className="text-xs text-muted-foreground">PDF işleniyor...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 py-1">
                <Upload className="w-5 h-5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">PDF sürükle veya tıkla</span>
              </div>
            )}
          </div>

          {/* Doc list */}
          <div className="space-y-0.5">
            <button
              onClick={() => { onDocSelect("all"); onMobileClose(); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all group",
                selectedDocId === "all"
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", selectedDocId === "all" ? "bg-primary" : "bg-white/20")} />
              <span className="text-xs font-medium">Tüm Belgeler</span>
            </button>

            {docsLoading && (
              <div className="px-3 py-4 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}

            <AnimatePresence>
              {documents?.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
                    selectedDocId === doc.id
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                  onClick={() => { onDocSelect(doc.id); onMobileClose(); }}
                >
                  {selectedDocId === doc.id ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  )}
                  <span className="text-xs font-medium truncate flex-1">{doc.filename}</span>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    disabled={deletingId === doc.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/20 hover:text-destructive transition-all"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {!docsLoading && (!documents || documents.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-3 px-2">
                Henüz belge yok
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          DocRAG v1.0 · Mezuniyet Projesi
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-card/40 border-r border-white/5 backdrop-blur-xl h-screen">
        {content}
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-[hsl(224,71%,5%)] border-r border-white/10 z-50 flex flex-col md:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

interface MobileMenuButtonProps {
  onClick: () => void;
}

export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2.5 rounded-xl bg-card/60 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-card transition-all"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
