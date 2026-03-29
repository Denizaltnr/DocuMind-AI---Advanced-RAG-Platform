import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
  isError?: boolean;
}

export function MarkdownMessage({ content, className, isError }: MarkdownMessageProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", isError && "prose-red", className)}>
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
                  className="bg-muted text-primary rounded px-1.5 py-0.5 text-[11px] font-mono border border-border"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="relative my-3 rounded-2xl overflow-hidden border border-border">
                {lang && (
                  <div className="flex items-center justify-between bg-muted px-4 py-1.5 border-b border-border">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                      {lang}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(children))}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-normal"
                    >
                      Kopyala
                    </button>
                  </div>
                )}
                <pre className="bg-muted/50 p-4 overflow-x-auto m-0">
                  <code className={cn("font-mono text-xs text-foreground", className)} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          p({ children }) {
            return (
              <p className="mb-2 last:mb-0 text-sm leading-relaxed text-foreground font-normal">
                {children}
              </p>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 space-y-1 mb-2 text-sm">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 space-y-1 mb-2 text-sm">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed text-foreground font-normal">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-semibold mb-3 text-foreground">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mb-2 text-foreground">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mb-2 text-foreground">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-3 font-normal">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="border-b border-border px-4 py-2 text-left text-xs font-semibold text-foreground">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-b border-border px-4 py-2 text-xs text-foreground font-normal">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-normal"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
          hr() {
            return <hr className="border-border my-3" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
