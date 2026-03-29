import { useState, useRef } from "react";
import { useListDocuments, useDeleteDocument } from "@workspace/api-client-react";
import { useUploadDocument } from "@/hooks/use-upload";
import {
  Plus,
  FileText,
  Upload,
  Loader2,
  Trash2,
  ChevronDown,
  Menu,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  History,
  X,
  Files,
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
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

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
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-foreground text-base leading-none">DocRAG</span>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-normal tracking-wide">
              AI Belge Analizi
            </p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── New Chat ─────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => { onNewChat(); onMobileClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all btn-glow active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Yeni Sohbet
        </button>
      </div>

      {/* ── Scrollable area ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center justify-between w-full px-1 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <History className="w-3 h-3" />
                Son Sohbetler
              </span>
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform duration-200",
                showHistory && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5">
                    {recentChats.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { onSelectHistory(item.question); onMobileClose(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
                      >
                        <MessageSquare className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-80" />
                        <span className="truncate">{item.question}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Documents section */}
        <div>
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Files className="w-3 h-3" />
              Belgeler
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
            >
              {uploading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Upload className="w-3 h-3" />
              }
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

          {/* Upload drop zone */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={cn(
              "mb-3 border-2 border-dashed border-border rounded-2xl p-4 text-center cursor-pointer",
              "transition-all hover:border-primary/40 hover:bg-accent",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-9 h-9">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">PDF işleniyor</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Lütfen bekleyin...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium text-foreground">PDF yükle</p>
                <p className="text-[10px] text-muted-foreground">Tıkla veya sürükle</p>
              </div>
            )}
          </div>

          {/* Document list */}
          <div className="space-y-0.5">
            <button
              onClick={() => { onDocSelect("all"); onMobileClose(); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all",
                selectedDocId === "all"
                  ? "bg-accent text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                selectedDocId === "all" ? "bg-primary" : "bg-border"
              )} />
              <span className="text-xs">Tüm Belgeler</span>
            </button>

            {docsLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}

            <AnimatePresence>
              {documents?.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer group transition-all",
                    selectedDocId === doc.id
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => { onDocSelect(doc.id); onMobileClose(); }}
                >
                  {selectedDocId === doc.id
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                    : <FileText className="w-3.5 h-3.5 shrink-0 opacity-50" />
                  }
                  <span className="text-xs font-normal truncate flex-1">{doc.filename}</span>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    disabled={deletingId === doc.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    {deletingId === doc.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />
                    }
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {!docsLoading && (!documents || documents.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4 px-2 font-normal">
                Henüz belge yüklenmedi
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground font-normal">
          DocRAG v1.0 · Mezuniyet Projesi
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border h-screen bg-white">
        {content}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 flex flex-col md:hidden shadow-2xl"
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
      className="md:hidden p-2 rounded-xl border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
