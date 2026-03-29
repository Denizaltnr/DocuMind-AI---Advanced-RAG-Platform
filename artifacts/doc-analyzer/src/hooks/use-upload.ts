import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useToast } from "./use-toast";

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Using the proxy endpoint described in the implementation notes
      const res = await fetch("/api/py/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Yükleme sırasında bir hata oluştu.";
        try {
          const errorData = await res.json();
          if (errorData.detail) errorMessage = errorData.detail;
        } catch {
          // ignore parsing error
        }
        throw new Error(errorMessage);
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      toast({
        title: "Başarılı",
        description: "Belge başarıyla yüklendi ve işlendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message,
      });
    },
  });
}
