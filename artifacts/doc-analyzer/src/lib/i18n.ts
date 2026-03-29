export type Lang = "tr" | "en";

export const translations = {
  tr: {
    /* ── Auth ── */
    auth: {
      loginTab: "Giriş Yap",
      registerTab: "Kayıt Ol",
      loginSubtitle: "Hesabınıza giriş yapın",
      registerSubtitle: "Ücretsiz hesap oluşturun",
      googleLogin: "Google ile Giriş Yap",
      googleRegister: "Google ile Kayıt Ol",
      or: "veya",
      emailLabel: "E-posta",
      emailPlaceholder: "ornek@email.com",
      passwordLabel: "Şifre",
      passwordPlaceholder: "••••••••",
      passwordNewPlaceholder: "En az 6 karakter",
      nameLabel: "Ad Soyad",
      nameOptional: "(isteğe bağlı)",
      namePlaceholder: "Adınız Soyadınız",
      loginButton: "Giriş Yap",
      registerButton: "Kayıt Ol",
      termsNote: "Kayıt olarak Kullanım Koşulları'nı kabul etmiş olursunuz.",
      popupBlocked: "Popup penceresi açılamadı. Tarayıcı popup engelleyicisini kapatın.",
      loginFailed: "Giriş başarısız.",
      registerFailed: "Kayıt başarısız.",
      googleFailed: "Google girişi başarısız.",
      passwordTooShort: "Şifre en az 6 karakter olmalıdır.",
    },

    /* ── Header ── */
    header: {
      uploadButton: "Belge Yükle",
      showSidebar: "Paneli göster",
      hideSidebar: "Paneli gizle",
      unknownUser: "Kullanıcı",
      logout: "Çıkış Yap",
    },

    /* ── Doc panel ── */
    docs: {
      sectionTitle: "Belgeler",
      allDocs: "Tüm Belgeler",
      noDocsTitle: "Belge yok",
      noDocsHint: "Yukarıdan PDF yükleyin",
      pages: (n: number) => `${n} sayfa`,
    },

    /* ── Chat panel ── */
    chat: {
      sectionTitle: "Sohbet",
      aiTyping: "AI yazıyor...",
      readyTitle: "Sormaya Hazır",
      readyDesc: "Yüklenen belge hakkında istediğiniz soruyu sorun.",
      suggestions: [
        "Bu belgenin ana konusu nedir?",
        "Önemli başlıkları listele",
        "Sonuç bölümünü özetle",
        "Hangi metodoloji kullanılmış?",
      ],
      you: "Siz",
      error: "Hata",
      sources: (n: number) => `${n} kaynaktan yanıtlandı`,
      page: "Sayfa",
      scrollDown: "Aşağı git",
      inputPlaceholder: "Bir şey sorun… (Shift+Enter yeni satır)",
      inputPlaceholderWaiting: "AI yanıt oluşturuyor...",
      sendLabel: "Gönder",
      disclaimer: "DocuMind AI yalnızca yüklenen belgeler üzerinden yanıt verir",
    },

    /* ── Upload modal ── */
    upload: {
      title: "Belge Yükle",
      subtitle: "PDF formatında bir belge seçin veya sürükleyin",
      dropIdle: "Dosyayı buraya sürükle veya seç",
      dropOver: "Bırakın, yüklemeye başlayalım",
      maxSize: (mb: number) => `Maksimum ${mb} MB · Yalnızca PDF`,
      selectFile: "Dosya Seç",
      processing: "İşleniyor…",
      uploaded: "Yüklendi!",
      retry: "Tekrar dene",
      footerNote: "Belge yüklendikten sonra AI tarafından analiz edilecek ve sorgulanabilir hale gelecektir.",
      toastTitle: "Belge yüklendi",
      onlyPdf: "Yalnızca PDF dosyaları desteklenir.",
      tooLarge: (mb: number) => `Dosya çok büyük (maks. ${mb} MB).`,
      uploadFailed: "Yükleme başarısız, tekrar deneyin.",
    },

    /* ── Home / errors ── */
    home: {
      allDocs: "Tüm Belgeler",
      newChat: "Yeni Sohbet",
      chatHistory: "Sohbet Geçmişi",
      errors: {
        network: "Bağlantı Hatası",
        timeout: "Zaman Aşımı",
        server: "Sunucu Hatası",
        validation: "Geçersiz İstek",
        not_found: "Endpoint Bulunamadı",
        unknown: "Bilinmeyen Hata",
      },
    },

    /* ── Lang switcher ── */
    lang: { switchTo: "Switch to English" },
  },

  en: {
    /* ── Auth ── */
    auth: {
      loginTab: "Sign In",
      registerTab: "Sign Up",
      loginSubtitle: "Sign in to your account",
      registerSubtitle: "Create a free account",
      googleLogin: "Continue with Google",
      googleRegister: "Sign up with Google",
      or: "or",
      emailLabel: "Email",
      emailPlaceholder: "example@email.com",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      passwordNewPlaceholder: "At least 6 characters",
      nameLabel: "Full Name",
      nameOptional: "(optional)",
      namePlaceholder: "Your Full Name",
      loginButton: "Sign In",
      registerButton: "Sign Up",
      termsNote: "By signing up you agree to our Terms of Service.",
      popupBlocked: "Popup was blocked. Please disable your browser's popup blocker.",
      loginFailed: "Sign in failed.",
      registerFailed: "Registration failed.",
      googleFailed: "Google sign-in failed.",
      passwordTooShort: "Password must be at least 6 characters.",
    },

    /* ── Header ── */
    header: {
      uploadButton: "Upload Document",
      showSidebar: "Show sidebar",
      hideSidebar: "Hide sidebar",
      unknownUser: "User",
      logout: "Sign Out",
    },

    /* ── Doc panel ── */
    docs: {
      sectionTitle: "Documents",
      allDocs: "All Documents",
      noDocsTitle: "No documents",
      noDocsHint: "Upload a PDF from above",
      pages: (n: number) => `${n} page${n !== 1 ? "s" : ""}`,
    },

    /* ── Chat panel ── */
    chat: {
      sectionTitle: "Chat",
      aiTyping: "AI is typing...",
      readyTitle: "Ready to Answer",
      readyDesc: "Ask any question about the uploaded document.",
      suggestions: [
        "What is the main topic of this document?",
        "List the important headings",
        "Summarize the conclusion section",
        "What methodology was used?",
      ],
      you: "You",
      error: "Error",
      sources: (n: number) => `Answered from ${n} source${n !== 1 ? "s" : ""}`,
      page: "Page",
      scrollDown: "Scroll down",
      inputPlaceholder: "Ask something… (Shift+Enter for new line)",
      inputPlaceholderWaiting: "AI is generating a response...",
      sendLabel: "Send",
      disclaimer: "DocuMind AI only answers based on the uploaded documents",
    },

    /* ── Upload modal ── */
    upload: {
      title: "Upload Document",
      subtitle: "Select or drag a PDF document",
      dropIdle: "Drag or select a file here",
      dropOver: "Drop it — let's go!",
      maxSize: (mb: number) => `Maximum ${mb} MB · PDF only`,
      selectFile: "Choose File",
      processing: "Processing…",
      uploaded: "Uploaded!",
      retry: "Try again",
      footerNote: "After uploading, the document will be analysed by AI and ready to query.",
      toastTitle: "Document uploaded",
      onlyPdf: "Only PDF files are supported.",
      tooLarge: (mb: number) => `File is too large (max ${mb} MB).`,
      uploadFailed: "Upload failed, please try again.",
    },

    /* ── Home / errors ── */
    home: {
      allDocs: "All Documents",
      newChat: "New Chat",
      chatHistory: "Chat History",
      errors: {
        network: "Connection Error",
        timeout: "Timeout",
        server: "Server Error",
        validation: "Invalid Request",
        not_found: "Endpoint Not Found",
        unknown: "Unknown Error",
      },
    },

    /* ── Lang switcher ── */
    lang: { switchTo: "Türkçe'ye geç" },
  },
} as const;

export type Translations = typeof translations.tr;
