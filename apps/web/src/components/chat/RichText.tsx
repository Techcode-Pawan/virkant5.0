import React from "react";

/** Renders **bold** and `code` inline without injecting HTML. */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyBase}-${i}`} className="font-semibold text-txt-primary">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={`${keyBase}-${i}`} className="code-id rounded bg-elevated px-1 py-px">{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>;
  });
}

/**
 * Minimal, safe formatter for model answers: paragraphs, numbered/bulleted lists,
 * blockquotes (used for verbatim document excerpts) and headings.
 */
export default function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(
        <blockquote key={i} className="border-l-2 border-accent/70 pl-3 text-txt-primary">
          {inline(quote.join(" "), `q${i}`)}
        </blockquote>,
      );
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(
        <ol key={i} className="list-decimal space-y-1 pl-5 marker:text-txt-faint">
          {items.map((it, j) => <li key={j}>{inline(it, `o${i}-${j}`)}</li>)}
        </ol>,
      );
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ""));
      blocks.push(
        <ul key={i} className="list-disc space-y-1 pl-5 marker:text-txt-faint">
          {items.map((it, j) => <li key={j}>{inline(it, `u${i}-${j}`)}</li>)}
        </ul>,
      );
      continue;
    }
    if (/^\s*#{1,4}\s+/.test(line)) {
      blocks.push(
        <p key={i} className="font-semibold text-txt-primary">
          {inline(line.replace(/^\s*#{1,4}\s+/, ""), `h${i}`)}
        </p>,
      );
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(>|\d+[.)]\s|[-*•]\s|#{1,4}\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={i}>{inline(para.join(" "), `p${i}`)}</p>);
  }
  return <div className="space-y-2.5 text-sm leading-relaxed">{blocks}</div>;
}
