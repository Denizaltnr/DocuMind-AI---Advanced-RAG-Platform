import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File, X, Loader2, CheckCircle2 } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-upload";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const { mutate: upload, isPending, isSuccess } = useUploadDocument();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: isPending || isSuccess
  });

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file) {
      upload(file, {
        onSuccess: () => {
          setTimeout(() => setFile(null), 3000);
        }
      });
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ease-out group",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-white/[0.02]",
          (isPending || isSuccess) ? "pointer-events-none opacity-90" : "cursor-pointer"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[280px]">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 mb-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                  <UploadCloud className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">PDF Belgesi Yükle</h3>
                <p className="text-muted-foreground max-w-sm">
                  Belgelerinizi sürükleyip bırakın veya seçmek için tıklayın. 
                  Sadece <span className="text-primary">.pdf</span> formatı desteklenmektedir.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="file"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 relative shadow-xl"
              >
                {!isPending && !isSuccess && (
                  <button 
                    onClick={removeFile}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-destructive text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <File className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left overflow-hidden">
                    <h4 className="font-semibold truncate text-foreground">{file.name}</h4>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>

                {isSuccess ? (
                  <div className="flex items-center justify-center gap-2 text-green-500 py-2 bg-green-500/10 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Başarıyla işlendi!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleUpload}
                    disabled={isPending}
                    className="w-full py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-primary to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>İşleniyor & Vektörleştiriliyor...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5" />
                        <span>Analizi Başlat</span>
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
