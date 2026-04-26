import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  }
};

monaco.editor.defineTheme('app-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#161a22',
    'editor.lineHighlightBackground': '#1d222c',
    'editorGutter.background': '#161a22',
    'diffEditor.insertedTextBackground': '#1d3a2433',
    'diffEditor.removedTextBackground': '#3a1d2433'
  }
});

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.sql': 'sql',
  '.ddl': 'sql',
  '.spc': 'sql',
  '.inc': 'sql',
  '.xml': 'xml',
  '.uixml': 'xml',
  '.radxml': 'xml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.json': 'json',
  '.md': 'markdown'
};

export function languageForFile(name: string): string | undefined {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return undefined;
  return EXTENSION_TO_LANGUAGE[name.slice(idx).toLowerCase()];
}

export { monaco };
