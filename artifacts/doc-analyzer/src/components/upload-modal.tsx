import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

type DropState = "idle" | "over" | "uploading" | "success" | "error";

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export function UploadModal({ open, onClose }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dropState, setDropState] = useState<DropState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const { mutate: uploadDoc } = useUploadDocument();
  const { toast } = useToast();

  const reset = useCallback(() => {
    setDropState("idle");
    setFileName(null);
  }, []);

  const handleClose = () => {
    if (dropState === "uploading") return;
    reset();
    onClose();
  };

  const processFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        setDropState("error");
        setFileName("Yalnızca PDF dosyaları desteklenir.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setDropState("error");
        setFileName(`Dosya çok büyük (maks. ${MAX_MB} MB).`);
        return;
      }

      setFileName(file.name);
      setDropState("uploading");

      uploadDoc(file, {
        onSuccess: () => {
          setDropState("success");
          toast({ title: "Belge yüklendi", description: file.name });
          setTimeout(() => {
            reset();
            onClose();
          }, 1400);
        },
        onError: () => {
          setDropState("error");
          setFileName("Yükleme başarısız, tekrar deneyin.");
        },
      });
    },
    [uploadDoc, toast, reset, onClose]
  );

  /* ── Drag events ─────────────────────────────────────────── */
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropState !== "uploading") setDropState("over");
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropState !== "uploading") setDropState("idle");
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  /* ── Zone appearance by state ───────────────────────────── */
  const zoneClass = cn(
    "relative flex flex-col items-center justify-center gap-5 w-full",
    "border-2 border-dashed rounded-3xl p-12 cursor-pointer",
    "transition-all duration-200",
    {
      "border-border bg-background hover:border-primary/40 hover:bg-accent/60":
        dropState === "idle",
      "border-primary bg-accent scale-[1.01]":
        dropState === "over",
      "border-primary/40 bg-accent/40 cursor-default pointer-events-none":
        dropState === "uploading",
      "border-green-400 bg-green-50 cursor-default pointer-events-none":
        dropState === "success",
      "border-red-300 bg-red-50 cursor-default":
        dropState === "error",
    }
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg bg-white rounded-3xl shadow-2xl shadow-foreground/10 border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Belge Yükle
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                    PDF formatında bir belge seçin veya sürükleyin
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={dropState === "uploading"}
                  className="w-8 h-8 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drop zone */}
              <div className="px-6 pb-6">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={onFileChange}
                />

                <div
                  className={zoneClass}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => dropState === "idle" || dropState === "error"
                    ? fileRef.current?.click()
                    : undefined
                  }
                >
                  {/* Idle / drag-over */}
                  {(dropState === "idle" || dropState === "over") && (
                    <>
                      <div className={cn(
                        "w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-200",
                        dropState === "over"
                          ? "bg-primary text-white scale-110 shadow-lg shadow-primary/25"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <FileText className="w-8 h-8" />
                      </div>
                      <div className="text-center space-y-1.5">
                        <p className={cn(
                          "text-sm font-medium transition-colors",
                          dropState === "over" ? "text-primary" : "text-foreground"
                        )}>
                          {dropState === "over"
                            ? "Bırakın, yüklemeye başlayalım"
                            : "Dosyayı buraya sürükle veya seç"
                          }
                        </p>
                        <p className="text-xs text-muted-foreground font-normal">
                          Maksimum {MAX_MB} MB · Yalnızca PDF
                        </p>
                      </div>
                      {dropState === "idle" && (
                        <button
                          type="button"
                          className="px-5 py-2.5 rounded-2xl bg-primary text-white text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 active:translate-y-0 flex items-center gap-2"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Dosya Seç
                        </button>
                      )}
                    </>
                  )}

                  {/* Uploading */}
                  {dropState === "uploading" && (
                    <>
                      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                      <div className="text-center space-y-1.5 w-full max-w-xs">
                        <p className="text-sm font-medium text-foreground">İşleniyor…</p>
                        <p className="text-xs text-muted-foreground font-normal truncate">{fileName}</p>
                        <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: "5%" }}
                            animate={{ width: "85%" }}
                            transition={{ duration: 3, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Success */}
                  {dropState === "success" && (
                    <>
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 14, stiffness: 200 }}
                        className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-green-700">Yüklendi!</p>
                        <p className="text-xs text-green-600/80 font-normal mt-0.5">{fileName}</p>
                      </div>
                    </>
                  )}

                  {/* Error */}
                  {dropState === "error" && (
                    <>
                      <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="text-center space-y-1.5">
                        <p className="text-sm font-medium text-red-700">{fileName}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); reset(); }}
                          className="text-xs text-primary underline underline-offset-2 font-normal hover:text-primary/80"
                        >
                          Tekrar dene
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer note */}
                {(dropState === "idle" || dropState === "over") && (
                  <p className="text-center text-[11px] text-muted-foreground mt-4 font-normal">
                    Belge yüklendikten sonra AI tarafından analiz edilecek ve sorgulanabilir hale gelecektir.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
