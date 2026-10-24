import type { ReactNode } from 'react';

/**
 * Rendu minimal et sûr du contenu saisi par les membres : paragraphes, listes « - »
 * et **gras**. Aucun HTML n'est interprété (pas de dangerouslySetInnerHTML).
 */
const inline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );

type Block = { kind: 'p'; lines: string[] } | { kind: 'ul'; items: string[] };

/** Regroupe les lignes consécutives : les « - » forment une liste, le reste un paragraphe. */
const toBlocks = (text: string): Block[] => {
  const blocks: Block[] = [];
  for (const chunk of text.trim().split(/\n{2,}/)) {
    let current: Block | undefined;
    for (const line of chunk.split('\n')) {
      const item = line.trim().startsWith('- ') ? line.trim().slice(2) : null;
      if (item !== null) {
        if (current?.kind !== 'ul') blocks.push((current = { kind: 'ul', items: [] }));
        current.items.push(item);
      } else {
        if (current?.kind !== 'p') blocks.push((current = { kind: 'p', lines: [] }));
        current.lines.push(line);
      }
    }
  }
  return blocks;
};

export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed text-ink-2">
      {toBlocks(text).map((block, i) =>
        block.kind === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {inline(block.lines.join('\n'))}
          </p>
        )
      )}
    </div>
  );
}
