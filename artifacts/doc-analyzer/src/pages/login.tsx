import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

function getBaseUrl() {
  return import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
}

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(data.detail ?? "Giriş başarısız.");
      login(data.access_token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    setError(null);

    const w = 500, h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      `${getBaseUrl()}/api/auth/google`,
      "google-oauth",
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      setError("Popup penceresi açılamadı. Tarayıcı popup engelleyicisini kapatın.");
      setGoogleLoading(false);
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "google-auth-success") {
        window.removeEventListener("message", onMessage);
        setGoogleLoading(false);
        login(event.data.token, event.data.user);
        navigate("/");
      } else if (event.data?.type === "google-auth-error") {
        window.removeEventListener("message", onMessage);
        setGoogleLoading(false);
        setError(event.data.error ?? "Google girişi başarısız.");
      }
    };
    window.addEventListener("message", onMessage);

    // Clean up if popup is closed manually
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener("message", onMessage);
        setGoogleLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
          <p className="text-sm text-muted-foreground mt-1">Hesabınıza giriş yapın</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-border rounded-3xl p-7 shadow-sm">

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl",
              "border border-border text-sm font-medium text-foreground",
              "hover:bg-muted transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
              "active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Google ile Giriş Yap
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">veya</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/5 border border-destructive/20 text-destructive text-xs px-3 py-2.5 rounded-2xl">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className={cn(
                    "w-full pl-9 pr-4 py-2.5 text-sm rounded-2xl border border-border bg-background",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                    "placeholder:text-muted-foreground/60 transition-all"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "w-full pl-9 pr-10 py-2.5 text-sm rounded-2xl border border-border bg-background",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                    "placeholder:text-muted-foreground/60 transition-all"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl",
                "bg-primary text-white text-sm font-medium",
                "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90",
                "active:translate-y-0 transition-all duration-200",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              )}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Giriş Yap
            </button>
          </form>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-muted-foreground mt-5">
          Hesabınız yok mu?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Kayıt Olun
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
