import { useState, useRef, useEffect } from "react";
import { Upload, LogOut, ChevronDown, PanelLeft, Globe } from "lucide-react";
import { UploadModal } from "@/components/upload-modal";
import { useAuth } from "@/contexts/auth-context";
import { useLang } from "@/contexts/lang-context";
import { cn } from "@/lib/utils";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLang();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 border-b border-border/60 bg-white/70 backdrop-blur-xl">

        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? t.header.hideSidebar : t.header.showSidebar}
          className={cn(
            "mr-3 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "active:scale-95"
          )}
        >
          <PanelLeft
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              !sidebarOpen && "rotate-180"
            )}
          />
        </button>

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
        <div className="flex items-center gap-2">

          {/* Language switcher */}
          <button
            onClick={toggleLang}
            title={t.lang.switchTo}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200",
              "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border",
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "tr" ? "EN" : "TR"}
          </button>

          {/* Upload button */}
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
            {t.header.uploadButton}
          </button>

          {/* User avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-2xl transition-all",
                "hover:bg-muted border border-transparent hover:border-border",
                menuOpen && "bg-muted border-border"
              )}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name ?? user.email}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-primary">{initials}</span>
                </div>
              )}
              <ChevronDown className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                menuOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-border rounded-2xl shadow-lg shadow-black/5 p-1.5 z-50">
                <div className="px-3 py-2 mb-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.full_name ?? t.header.unknownUser}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="h-px bg-border mx-1 mb-1" />
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t.header.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
