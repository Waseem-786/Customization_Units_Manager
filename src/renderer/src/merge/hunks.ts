import * as Diff from 'diff';

export type HunkSide = 'current' | 'new';

export type HunkBlock =
  | { kind: 'equal'; text: string }
  | { kind: 'hunk'; index: number; current: string; next: string };

export interface DiffComputation {
  blocks: HunkBlock[];
  hunkCount: number;
}

export function computeBlocks(currentText: string, newText: string): DiffComputation {
  const parts = Diff.diffLines(currentText, newText);
  const blocks: HunkBlock[] = [];
  let hunkIndex = 0;
  let i = 0;
  while (i < parts.length) {
    const p = parts[i];
    if (!p.added && !p.removed) {
      if (p.value.length > 0) blocks.push({ kind: 'equal', text: p.value });
      i++;
      continue;
    }
    let cur = '';
    let nu = '';
    while (i < parts.length && (parts[i].added || parts[i].removed)) {
      if (parts[i].removed) cur += parts[i].value;
      if (parts[i].added) nu += parts[i].value;
      i++;
    }
    blocks.push({ kind: 'hunk', index: hunkIndex, current: cur, next: nu });
    hunkIndex++;
  }
  return { blocks, hunkCount: hunkIndex };
}

export function assembleMerged(blocks: HunkBlock[], choices: HunkSide[]): string {
  let out = '';
  for (const b of blocks) {
    if (b.kind === 'equal') {
      out += b.text;
    } else {
      const choice = choices[b.index] ?? 'new';
      out += choice === 'current' ? b.current : b.next;
    }
  }
  return out;
}

export function countLines(s: string): number {
  if (!s) return 0;
  const n = s.split('\n').length;
  return s.endsWith('\n') ? n - 1 : n;
}
