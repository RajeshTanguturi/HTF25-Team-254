import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';

const CodeEditor = ({ code, setCode, language }) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco && (language === 'python' || language === 'java')) {
      monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: () => {
          const suggestions = [
            {
              label: 'print', // keyword or snippet
              kind: monaco.languages.CompletionItemKind.Function,
              insertText:
                language === 'python'
                  ? 'print(${1})'
                  : 'System.out.println(${1});',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Print to console',
            },
            {
              label: 'class',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'class ${1:ClassName} {\n    $0\n}',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Define a class',
            },
          ];
          return { suggestions };
        },
      });

      // Optional: Add "sout" snippet like IntelliJ / LeetCode
      if (language === 'java') {
        monaco.languages.registerCompletionItemProvider('java', {
          triggerCharacters: [],
          provideCompletionItems: () => ({
            suggestions: [
              {
                label: 'sout',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'System.out.println(${1});',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Print to console',
              },
            ],
          }),
        });
      }
    }
  }, [monaco, language]);

  return (
    <div className="h-full border border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value || '')}
        options={{
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          minimap: { enabled: true, scale: 0.8 },
          'semanticHighlighting.enabled': true,
          lightbulb: { enabled: true },
          suggest: { showFunctions: true, showKeywords: true },
          parameterHints: { enabled: true },
          bracketPairColorization: { enabled: true },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          tabSize: 4, // LeetCode style
          insertSpaces: true, // Always spaces, no tabs
          detectIndentation: false, // Keep tab size fixed
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnType: true,
          formatOnPaste: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
