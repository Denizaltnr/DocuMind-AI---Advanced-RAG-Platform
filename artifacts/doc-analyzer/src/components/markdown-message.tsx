import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn("prose prose-invert prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isInline = !className;
            const match = /language-(\w+)/.exec(className || "");
            const lang = match?.[1] ?? "";
            if (isInline) {
              return (
                <code
                  className="bg-white/10 text-blue-300 rounded px-1.5 py-0.5 text-xs font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="relative my-3 rounded-xl overflow-hidden border border-white/10">
                {lang && (
                  <div className="flex items-center justify-between bg-black/40 px-4 py-1.5 border-b border-white/10">
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{lang}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(children))}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Kopyala
                    </button>
                  </div>
                )}
                <pre className="bg-black/30 p-4 overflow-x-auto m-0 text-sm">
                  <code className={cn("font-mono text-emerald-300", className)} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-3 text-white">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mb-2 text-white">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mb-2 text-white/90">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-3">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-white/10">{children}</thead>;
          },
          th({ children }) {
            return <th className="border border-white/10 px-3 py-2 text-left font-semibold">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-white/10 px-3 py-2">{children}</td>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          hr() {
            return <hr className="border-white/10 my-3" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
