import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    monacoEditorPlugin.default({
      languageWorkers: [
        'editorWorkerService',
        'typescript',
        'json',
        'html',
        'css'
      ],
      customLanguages: [
        {
          label: 'java',
          entry: 'monaco-editor/esm/vs/basic-languages/java/java.js'
        },
        {
          label: 'python',
          entry: 'monaco-editor/esm/vs/basic-languages/python/python.js'
        }
      ]
    }),
  ],
})
