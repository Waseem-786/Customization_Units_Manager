import { useEffect, useRef } from 'react';
import { monaco } from '../monaco/setup';

interface Props {
  original: string;
  modified: string;
  language?: string;
  modifiedEditable: boolean;
  onModifiedChange?: (value: string) => void;
  height?: number | string;
}

export function DiffViewer({
  original,
  modified,
  language,
  modifiedEditable,
  onModifiedChange,
  height = '60vh'
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const onChangeRef = useRef(onModifiedChange);

  useEffect(() => {
    onChangeRef.current = onModifiedChange;
  }, [onModifiedChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = monaco.editor.createDiffEditor(containerRef.current, {
      automaticLayout: true,
      readOnly: !modifiedEditable,
      originalEditable: false,
      theme: 'app-dark',
      renderSideBySide: true,
      minimap: { enabled: false },
      fontSize: 13,
      wordWrap: 'off',
      scrollBeyondLastLine: false
    });
    editorRef.current = editor;

    return () => {
      editor.getModel()?.original.dispose();
      editor.getModel()?.modified.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const previous = editor.getModel();
    const originalModel = monaco.editor.createModel(original, language);
    const modifiedModel = monaco.editor.createModel(modified, language);
    editor.setModel({ original: originalModel, modified: modifiedModel });
    previous?.original.dispose();
    previous?.modified.dispose();

    const sub = modifiedModel.onDidChangeContent(() => {
      onChangeRef.current?.(modifiedModel.getValue());
    });
    return () => sub.dispose();
  }, [original, modified, language]);

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: !modifiedEditable });
  }, [modifiedEditable]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        border: '1px solid var(--border)',
        borderRadius: 6,
        overflow: 'hidden'
      }}
    />
  );
}
