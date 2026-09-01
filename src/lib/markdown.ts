/**
 * A deliberately small Markdown subset for post bodies.
 *
 * Everything is HTML-escaped before any formatting is applied, so raw HTML in a
 * post can never become live markup. That removes the need for a sanitiser and
 * keeps the blog free of a parser dependency it would otherwise have to audit.
 *
 * Supported: headings, paragraphs, nested unordered/ordered lists, tables,
 * blockquotes, fenced code blocks, horizontal rules, and inline code / bold /
 * italic / links.
 */

type ListItem = { text: string; children: ListBlock | null };
type ListBlock = { kind: "list"; ordered: boolean; items: ListItem[] };

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | ListBlock
  | { kind: "table"; header: string[]; align: (string | null)[]; rows: string[][] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; language: string; lines: string[] }
  | { kind: "rule" };

export function renderMarkdown(source: string) {
  return parseBlocks(source.replace(/\r\n?/g, "\n").split("\n")).map(renderBlock).join("\n");
}

const bulletPattern = /^(\s*)[-*+]\s+(.*)$/;
const orderedPattern = /^(\s*)\d+[.)]\s+(.*)$/;

function listMatch(line: string) {
  const bullet = bulletPattern.exec(line);
  if (bullet) return { indent: bullet[1]!.length, text: bullet[2]!, ordered: false };
  const ordered = orderedPattern.exec(line);
  if (ordered) return { indent: ordered[1]!.length, text: ordered[2]!, ordered: true };
  return null;
}

/** A separator row is what distinguishes a table from ordinary pipe-containing text. */
function isTableSeparator(line: string | undefined) {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.includes("-") && /^\|?[\s:|-]+\|[\s:|-]*$/.test(trimmed) && trimmed.includes("|");
}

function splitRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
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

    const fence = /^```(\w*)\s*$/.exec(line.trim());
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test((lines[index] ?? "").trim())) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", language: fence[1] ?? "", lines: body });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
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

    if (line.trim().startsWith("|") && isTableSeparator(lines[index + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[index + 1]!).map(cell => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        if (left) return "left";
        return null;
      });
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        rows.push(splitRow(lines[index]!));
        index += 1;
      }
      blocks.push({ kind: "table", header, align, rows });
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

    if (listMatch(line)) {
      const collected: string[] = [];
      while (index < lines.length && listMatch(lines[index] ?? "")) {
        collected.push(lines[index]!);
        index += 1;
      }
      blocks.push(parseList(collected));
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (!current.trim() || /^(#{1,6}\s|>|```)/.test(current) || listMatch(current)) break;
      if (current.trim().startsWith("|") && isTableSeparator(lines[index + 1])) break;
      paragraph.push(current.trim());
      index += 1;
    }
    if (paragraph.length > 0) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

/** Groups consecutive list lines into a tree using their leading indentation. */
function parseList(lines: string[]): ListBlock {
  const first = listMatch(lines[0]!)!;
  const block: ListBlock = { kind: "list", ordered: first.ordered, items: [] };
  let index = 0;

  while (index < lines.length) {
    const entry = listMatch(lines[index]!)!;
    if (entry.indent > first.indent) {
      // Deeper lines belong to the item opened just above.
      const nested: string[] = [];
      while (index < lines.length && listMatch(lines[index]!)!.indent > first.indent) {
        nested.push(lines[index]!);
        index += 1;
      }
      const parent = block.items[block.items.length - 1];
      if (parent) parent.children = parseList(nested);
      continue;
    }
    block.items.push({ text: entry.text, children: null });
    index += 1;
  }

  return block;
}

function renderList(block: ListBlock): string {
  const tag = block.ordered ? "ol" : "ul";
  const items = block.items
    .map(item => `<li>${inline(item.text)}${item.children ? renderList(item.children) : ""}</li>`)
    .join("");
  return `<${tag}>${items}</${tag}>`;
}

function renderBlock(block: Block): string {
  switch (block.kind) {
    case "heading":
      return `<h${block.level}>${inline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p>${inline(block.text)}</p>`;
    case "list":
      return renderList(block);
    case "table": {
      const style = (index: number) => {
        const align = block.align[index];
        return align ? ` style="text-align:${align}"` : "";
      };
      const head = block.header.map((cell, i) => `<th${style(i)}>${inline(cell)}</th>`).join("");
      const body = block.rows
        .map(row => `<tr>${row.map((cell, i) => `<td${style(i)}>${inline(cell)}</td>`).join("")}</tr>`)
        .join("");
      // Wide tables scroll inside their own container instead of stretching the page.
      return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
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
