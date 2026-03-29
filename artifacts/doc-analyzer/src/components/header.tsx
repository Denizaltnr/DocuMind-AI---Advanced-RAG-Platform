import { useState } from "react";
import { Upload, User } from "lucide-react";
import { UploadModal } from "@/components/upload-modal";
import { cn } from "@/lib/utils";

export function Header() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-6 border-b border-border/60 bg-white/70 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" fill="white" fillOpacity=".9"/>
              <path d="M10 2l3 3h-3V2z" fill="white" fillOpacity=".6"/>
              <path d="M5 8h6M5 11h4" stroke="hsl(224 76% 48%)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-base font-semibold text-foreground tracking-tight">
            DocuMind<span className="text-primary"> AI</span>
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium",
              "transition-all duration-200 ease-out",
              "bg-primary text-white",
              "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90",
              "active:translate-y-0 active:shadow-md"
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Belge Yükle
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </header>

      <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
