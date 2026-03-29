import { useListDocuments, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Loader2,
  Trash2,
  CheckCircle2,
  Plus,
  LayoutGrid,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/lang-context";

interface DocPanelProps {
  selectedDocId: string | "all";
  onDocSelect: (id: string | "all") => void;
  collapsed: boolean;
}

export function DocPanel({ selectedDocId, onDocSelect, collapsed }: DocPanelProps) {
  const { data: documents, isLoading } = useListDocuments();
  const { mutate: deleteDoc } = useDeleteDocument();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { t, lang } = useLang();
  const dateLocale = lang === "tr" ? "tr-TR" : "en-GB";

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    deleteDoc(
      { id },
      {
        onSettled: () => setDeletingId(null),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          if (selectedDocId === id) onDocSelect("all");
        },
      }
    );
  };

  const docCount = documents?.length ?? 0;

  /* ── Collapsed (icon-strip) mode ──────────────────────────────── */
  if (collapsed) {
    return (
      <aside className="flex flex-col items-center h-full pt-1 gap-1.5 overflow-hidden w-full">
        {/* "All docs" icon */}
        <button
          onClick={() => onDocSelect("all")}
          title={t.docs.allDocs}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
            selectedDocId === "all"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-5 h-px bg-border" />

        {/* Document icons */}
        <div className="flex flex-col items-center gap-1.5 overflow-y-auto flex-1 w-full pb-2">
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mt-2" />
          )}
          <AnimatePresence>
            {documents?.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              return (
                <motion.button
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onDocSelect(doc.id)}
                  title={doc.filename}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                    isSelected
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <FileText className="w-4 h-4" />
                </motion.button>
              );
            })}
          </AnimatePresence>

          {!isLoading && docCount === 0 && (
            <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </aside>
    );
  }

  /* ── Expanded mode ─────────────────────────────────────────────── */
  return (
    <aside className="flex flex-col h-full overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t.docs.sectionTitle}
        </h2>
        {docCount > 0 && (
          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-normal">
            {docCount}
          </span>
        )}
      </div>

      {/* "All docs" pill */}
      <button
        onClick={() => onDocSelect("all")}
        className={cn(
          "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-2xl text-sm transition-all mb-3 text-left",
          selectedDocId === "all"
            ? "bg-accent border border-primary/20 text-primary font-medium"
            : "bg-white border border-border text-muted-foreground hover:bg-muted hover:text-foreground font-normal"
        )}
      >
        <div className={cn(
          "w-6 h-6 rounded-xl flex items-center justify-center shrink-0",
          selectedDocId === "all" ? "bg-primary/10" : "bg-muted"
        )}>
          <FileText className={cn("w-3.5 h-3.5", selectedDocId === "all" ? "text-primary" : "text-muted-foreground")} />
        </div>
        <span className="text-xs truncate">{t.docs.allDocs}</span>
        {selectedDocId === "all" && (
          <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />
        )}
      </button>

      {/* Document thumbnail cards */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        <AnimatePresence>
          {documents?.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            const ext = doc.filename.split(".").pop()?.toUpperCase() ?? "PDF";
            const nameWithoutExt = doc.filename.replace(/\.[^.]+$/, "");

            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={() => onDocSelect(doc.id)}
                className={cn(
                  "group relative flex flex-col rounded-2xl border cursor-pointer transition-all overflow-hidden",
                  isSelected
                    ? "border-primary/30 bg-accent shadow-sm shadow-primary/5"
                    : "border-border bg-white hover:border-primary/20 hover:bg-accent/40"
                )}
              >
                {/* Thumbnail area */}
                <div className={cn(
                  "relative h-24 flex items-center justify-center",
                  isSelected ? "bg-primary/5" : "bg-muted/60"
                )}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-10 h-12 rounded-lg flex flex-col items-center justify-center relative shadow-sm",
                      isSelected ? "bg-primary text-white" : "bg-white border border-border text-muted-foreground"
                    )}>
                      <FileText className="w-5 h-5" />
                      <span className={cn(
                        "text-[8px] font-bold tracking-wider mt-0.5",
                        isSelected ? "text-white/80" : "text-muted-foreground/70"
                      )}>
                        {ext}
                      </span>
                      <div className={cn(
                        "absolute top-0 right-0 w-2.5 h-2.5",
                        isSelected ? "border-l border-b border-primary/30 bg-white/20" : "border-l border-b border-border bg-muted"
                      )} style={{ borderBottomLeftRadius: "3px" }} />
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                  )}

                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    disabled={deletingId === doc.id}
                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                  >
                    {deletingId === doc.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />
                    }
                  </button>
                </div>

                {/* File info */}
                <div className="px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground truncate leading-tight">
                    {nameWithoutExt}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                    {doc.pageCount != null ? t.docs.pages(doc.pageCount) : "PDF"}
                    {doc.uploadedAt && (
                      <> · {new Date(doc.uploadedAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}</>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!isLoading && docCount === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{t.docs.noDocsTitle}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                {t.docs.noDocsHint}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
