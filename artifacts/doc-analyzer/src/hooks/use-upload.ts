import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getListDocumentsQueryKey } from "@workspace/api-client-react";
import { uploadPdf, ChatApiError } from "@/lib/chat-api";
import { useToast } from "./use-toast";

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => uploadPdf(file),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      toast({
        title: "Belge Yüklendi",
        description: "PDF başarıyla işlendi ve sorgulamaya hazır.",
        duration: 4000,
      });
    },

    onError: (error: Error) => {
      const isChatApiError = error instanceof ChatApiError;

      const titles: Record<string, string> = {
        network: "Bağlantı Hatası",
        timeout: "Zaman Aşımı",
        server: "Sunucu Hatası",
        validation: "Geçersiz Dosya",
        not_found: "Endpoint Bulunamadı",
        unknown: "Yükleme Hatası",
      };

      toast({
        variant: "destructive",
        title: isChatApiError
          ? titles[(error as ChatApiError).type] ?? "Yükleme Hatası"
          : "Yükleme Hatası",
        description: error.message,
        duration: 7000,
      });
    },
  });
}
