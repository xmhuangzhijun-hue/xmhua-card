/**
 * A deliberately small Markdown subset for post bodies.
 *
 * Everything is HTML-escaped before any formatting is applied, so raw HTML in a
 * post can never become live markup. That removes the need for a sanitiser and
 * keeps the blog free of a parser dependency it would otherwise have to audit.
 *
 * Supported: headings, paragraphs, unordered and ordered lists, blockquotes,
 * fenced code blocks, horizontal rules, and inline code / bold / italic / links.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; language: string; lines: string[] }
  | { kind: "rule" };

export function renderMarkdown(source: string) {
  return parseBlocks(source.replace(/\r\n?/g, "\n").split("\n")).map(renderBlock).join("\n");
}

function parseBlocks(lines: string[]) {
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? "")) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", language: fence[1] ?? "", lines: body });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2]!.trim() });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoted.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "quote", lines: quoted });
      continue;
    }

    const bulletPattern = /^[-*+]\s+(.*)$/;
    const orderedPattern = /^\d+[.)]\s+(.*)$/;
    const isBullet = bulletPattern.test(line);
    if (isBullet || orderedPattern.test(line)) {
      const pattern = isBullet ? bulletPattern : orderedPattern;
      const items: string[] = [];
      while (index < lines.length) {
        const match = pattern.exec(lines[index] ?? "");
        if (!match) break;
        items.push(match[1]!);
        index += 1;
      }
      blocks.push({ kind: "list", ordered: !isBullet, items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (!current.trim() || /^(#{1,6}\s|>|```|[-*+]\s|\d+[.)]\s)/.test(current)) break;
      paragraph.push(current.trim());
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderBlock(block: Block): string {
  switch (block.kind) {
    case "heading":
      return `<h${block.level}>${inline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p>${inline(block.text)}</p>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag}>${block.items.map(item => `<li>${inline(item)}</li>`).join("")}</${tag}>`;
    }
    case "quote":
      return `<blockquote>${parseBlocks(block.lines).map(renderBlock).join("")}</blockquote>`;
    case "code": {
      const className = block.language ? ` class="language-${escapeHtml(block.language)}"` : "";
      return `<pre><code${className}>${escapeHtml(block.lines.join("\n"))}</code></pre>`;
    }
    case "rule":
      return "<hr />";
  }
}

/**
 * Splitting on backticks keeps code spans literal without needing a placeholder
 * character: odd segments are code, even segments get the formatting rules.
 */
function inline(text: string) {
  return escapeHtml(text)
    .split("`")
    .map((segment, index) => (index % 2 === 1 ? `<code>${segment}</code>` : formatSegment(segment)))
    .join("");
}

function formatSegment(segment: string) {
  return segment
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) =>
      isSafeHref(href) ? `<a href="${href}"${externalAttributes(href)}>${label}</a>` : match)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

/** Only destinations that cannot execute script. Blocks javascript: and data: URLs. */
function isSafeHref(href: string) {
  return /^(https?:\/\/|\/|#|mailto:)/i.test(href);
}

function externalAttributes(href: string) {
  return /^https?:\/\//i.test(href) ? ' target="_blank" rel="noreferrer noopener"' : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
