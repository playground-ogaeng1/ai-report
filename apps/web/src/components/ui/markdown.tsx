import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 마크다운 렌더링. **순수 UI** — 문자열만 받습니다. (첨삭·총평 공용)
 *
 * Tailwind 는 기본적으로 h3/ul 같은 태그 스타일을 지우기 때문에
 * (preflight) 요소별 클래스를 직접 지정합니다. typography 플러그인을
 * 추가하지 않고 쓰는 요소만 다룹니다.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mt-5 mb-2 text-base font-semibold first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-5 mb-2 text-base font-semibold first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-base font-semibold first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-4 mb-1 text-sm font-semibold">{children}</h4>
          ),
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-black/20 pl-3 text-black/70 dark:border-white/25 dark:text-white/70">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-4 border-black/10 dark:border-white/15" />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
