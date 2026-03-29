import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useLang } from "@/contexts/lang-context";

function getBaseUrl() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { t } = useLang();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const gsiReady = useRef(false);

  const resetForm = () => {
    setEmail(""); setPassword(""); setFullName("");
    setError(null); setShowPass(false);
  };

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    resetForm();
  };

  const handleGoogleCredential = async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/google/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Google girişi başarısız.");
      login(data.access_token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const initGSI = () => {
    if (!window.google || !GOOGLE_CLIENT_ID || gsiReady.current) return;
    gsiReady.current = true;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "center",
        width: googleBtnRef.current.offsetWidth || 320,
      });
    }
  };

  useEffect(() => {
    const tryInit = () => {
      if (window.google && !gsiReady.current) {
        initGSI();
      }
    };
    tryInit();
    if (!window.google) {
      const script = document.querySelector('script[src*="accounts.google.com/gsi"]');
      if (script) {
        script.addEventListener("load", tryInit);
        return () => script.removeEventListener("load", tryInit);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? t.auth.loginFailed);
      login(data.access_token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError(t.auth.passwordTooShort); return; }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? t.auth.registerFailed);
      login(data.access_token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = cn(
    "w-full py-2.5 text-sm rounded-2xl border border-border bg-background",
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
    "placeholder:text-muted-foreground/60 transition-all",
  );

  return (
    <div className="min-h-screen overflow-y-auto flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-md mb-3">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" fill="white" fillOpacity=".9"/>
              <path d="M10 2l3 3h-3V2z" fill="white" fillOpacity=".6"/>
              <path d="M5 8h6M5 11h4" stroke="hsl(224 76% 48%)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            DocuMind<span className="text-primary"> AI</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={cn(
                "flex-1 py-3.5 text-sm font-medium transition-all",
                tab === "login"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {t.auth.loginTab}
            </button>
            <button
              type="button"
              onClick={() => switchTab("register")}
              className={cn(
                "flex-1 py-3.5 text-sm font-medium transition-all",
                tab === "register"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {t.auth.registerTab}
            </button>
          </div>

          <div className="p-7">
            {/* Google Sign In Button (rendered by GSI) */}
            <div className="w-full flex justify-center">
              {googleLoading ? (
                <div className="flex items-center justify-center gap-3 w-full py-2.5 rounded-full border border-border text-sm font-medium text-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor…
                </div>
              ) : (
                <div ref={googleBtnRef} className="w-full" />
              )}
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{t.auth.or}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {error && (
              <div className="mb-4 bg-destructive/5 border border-destructive/20 text-destructive text-xs px-3 py-2.5 rounded-2xl">
                {error}
              </div>
            )}

            {/* LOGIN FORM */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">{t.auth.emailLabel}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email" required autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t.auth.emailPlaceholder}
                      className={cn(inputClass, "pl-9 pr-4")}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">{t.auth.passwordLabel}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPass ? "text" : "password"} required autoComplete="current-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={t.auth.passwordPlaceholder}
                      className={cn(inputClass, "pl-9 pr-10")}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl",
                    "bg-primary text-white text-sm font-medium",
                    "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90",
                    "active:translate-y-0 transition-all duration-200",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none",
                  )}>
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.auth.loginButton}
                </button>
              </form>
            )}

            {/* REGISTER FORM */}
            {tab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    {t.auth.nameLabel} <span className="text-muted-foreground font-normal">{t.auth.nameOptional}</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text" autoComplete="name"
                      value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder={t.auth.namePlaceholder}
                      className={cn(inputClass, "pl-9 pr-4")}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">{t.auth.emailLabel}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email" required autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder={t.auth.emailPlaceholder}
                      className={cn(inputClass, "pl-9 pr-4")}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">{t.auth.passwordLabel}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPass ? "text" : "password"} required minLength={6} autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={t.auth.passwordNewPlaceholder}
                      className={cn(inputClass, "pl-9 pr-10")}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl",
                    "bg-primary text-white text-sm font-medium",
                    "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90",
                    "active:translate-y-0 transition-all duration-200",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none",
                  )}>
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.auth.registerButton}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  {t.auth.termsNote}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
