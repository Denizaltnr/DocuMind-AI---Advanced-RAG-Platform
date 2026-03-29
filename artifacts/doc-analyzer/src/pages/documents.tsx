import { Layout } from "@/components/layout";
import { FileUpload } from "@/components/file-upload";
import { useListDocuments, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Calendar, Layers, FileDigit, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { motion, type Variants } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    if (confirm("Bu belgeyi silmek istediğinize emin misiniz?")) {
      deleteDoc(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
            toast({ title: "Başarılı", description: "Belge silindi." });
          },
          onError: () => {
            toast({ variant: "destructive", title: "Hata", description: "Belge silinirken hata oluştu." });
          }
        }
      );
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      <div className="space-y-10 pb-20">
        <section>
          <div className="mb-6">
            <h1 className="text-3xl font-display font-bold">Belge Yönetimi</h1>
            <p className="text-muted-foreground mt-2">Sorgulamak istediğiniz PDF belgelerini yükleyin.</p>
          </div>
          <FileUpload />
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-semibold">Yüklü Belgeler</h2>
            {documents && <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">{documents.length} Belge</span>}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : documents?.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card/30">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">Henüz belge yok</h3>
              <p className="text-muted-foreground">Yukarıdaki alandan ilk belgenizi yükleyin.</p>
            </div>
          ) : (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {documents?.map((doc) => (
                <motion.div 
                  key={doc.id}
                  variants={item}
                  className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={isDeleting}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Belgeyi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-4 truncate text-foreground" title={doc.filename}>
                    {doc.filename}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>{doc.pageCount} Sayfa</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileDigit className="w-4 h-4 text-blue-400" />
                      <span>{doc.chunkCount} Parça</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(doc.uploadedAt), "d MMM yyyy, HH:mm", { locale: tr })}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </Layout>
  );
}
