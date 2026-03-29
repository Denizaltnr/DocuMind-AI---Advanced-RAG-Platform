import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { FileText, MessageSquare, History, Menu, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Belgeler", icon: FileText },
    { path: "/query", label: "Sorgu", icon: MessageSquare },
    { path: "/history", label: "Geçmiş", icon: History },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Abstract Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 h-full border-r border-border/50 glass-panel z-10 relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Layers className="text-white w-6 h-6" />
          </div>
          <span className="font-display font-bold text-xl text-white tracking-wide">
            DocRAG
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer
                    ${isActive 
                      ? "bg-primary/15 text-primary font-medium border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-border/50">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>RAG Platform v1.0</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border/50 glass-panel z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Layers className="text-primary w-6 h-6" />
          <span className="font-display font-bold text-lg text-white">DocRAG</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-20 px-4 pb-6 flex flex-col"
          >
            <nav className="flex-1 space-y-2 mt-8">
              {navItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                    <div
                      className={`
                        flex items-center gap-4 px-6 py-4 rounded-2xl transition-all
                        ${isActive ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground"}
                      `}
                    >
                      <item.icon className="w-6 h-6" />
                      <span className="text-lg">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 relative z-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
