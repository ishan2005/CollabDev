import { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({
    value,
    language,
    onChange,
    onCursorChange,
    onSelectionChange,
    cursors,
    fontSize,
    fileName,
    theme
}) {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorationsRef = useRef([]);
    const isRemoteUpdate = useRef(false);
    const cursorWidgetsRef = useRef(new Map());

    const handleEditorDidMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Define WhatsApp Dark theme
        monaco.editor.defineTheme('collabdev-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '667781', fontStyle: 'italic' },
                { token: 'keyword', foreground: '25D366' },
                { token: 'string', foreground: '53BDEB' },
                { token: 'number', foreground: 'F0B90B' },
                { token: 'type', foreground: '00A884' },
                { token: 'function', foreground: '53BDEB' },
                { token: 'variable', foreground: 'E9EDEF' },
                { token: 'operator', foreground: '00A884' },
                { token: 'delimiter', foreground: '8696A0' },
                { token: 'tag', foreground: '25D366' },
                { token: 'attribute.name', foreground: '53BDEB' },
                { token: 'attribute.value', foreground: '00A884' },
            ],
            colors: {
                'editor.background': '#111B21',
                'editor.foreground': '#E9EDEF',
                'editor.lineHighlightBackground': '#1F2C34',
                'editor.selectionBackground': '#00A88433',
                'editor.inactiveSelectionBackground': '#00A8841A',
                'editorCursor.foreground': '#00A884',
                'editorLineNumber.foreground': '#4E5D66',
                'editorLineNumber.activeForeground': '#8696A0',
                'editor.selectionHighlightBackground': '#00A88415',
                'editorIndentGuide.background': '#233138',
                'editorIndentGuide.activeBackground': '#2A3942',
                'editorBracketMatch.background': '#00A88422',
                'editorBracketMatch.border': '#00A88444',
                'scrollbarSlider.background': '#4E5D6633',
                'scrollbarSlider.hoverBackground': '#4E5D6666',
                'scrollbarSlider.activeBackground': '#4E5D6699',
                'minimap.background': '#111B21',
                'editorOverviewRuler.border': '#1F2C34',
            }
        });

        // Define WhatsApp Light theme
        monaco.editor.defineTheme('collabdev-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '667781', fontStyle: 'italic' },
                { token: 'keyword', foreground: '008069' },
                { token: 'string', foreground: '1D6FA5' },
                { token: 'number', foreground: 'B45309' },
                { token: 'type', foreground: '008069' },
                { token: 'function', foreground: '1D6FA5' },
                { token: 'variable', foreground: '111B21' },
                { token: 'operator', foreground: '008069' },
                { token: 'delimiter', foreground: '54656F' },
                { token: 'tag', foreground: '008069' },
                { token: 'attribute.name', foreground: '1D6FA5' },
                { token: 'attribute.value', foreground: '008069' },
            ],
            colors: {
                'editor.background': '#FFFFFF',
                'editor.foreground': '#111B21',
                'editor.lineHighlightBackground': '#F5F6F6',
                'editor.selectionBackground': '#00806933',
                'editor.inactiveSelectionBackground': '#0080691A',
                'editorCursor.foreground': '#008069',
                'editorLineNumber.foreground': '#8696A0',
                'editorLineNumber.activeForeground': '#54656F',
                'editor.selectionHighlightBackground': '#00806915',
                'editorIndentGuide.background': '#E9EDEF',
                'editorIndentGuide.activeBackground': '#D1D7DB',
                'editorBracketMatch.background': '#00806922',
                'editorBracketMatch.border': '#00806944',
                'scrollbarSlider.background': '#8696A033',
                'scrollbarSlider.hoverBackground': '#8696A066',
                'scrollbarSlider.activeBackground': '#8696A099',
                'minimap.background': '#FFFFFF',
                'editorOverviewRuler.border': '#E9EDEF',
            }
        });

        // Set initial theme
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        monaco.editor.setTheme(currentTheme === 'light' ? 'collabdev-light' : 'collabdev-dark');

        // Cursor position listener
        editor.onDidChangeCursorPosition((e) => {
            if (!isRemoteUpdate.current) {
                onCursorChange({
                    lineNumber: e.position.lineNumber,
                    column: e.position.column
                });
            }
        });

        // Selection listener
        editor.onDidChangeCursorSelection((e) => {
            if (!isRemoteUpdate.current) {
                const sel = e.selection;
                if (sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn) {
                    onSelectionChange({
                        startLineNumber: sel.startLineNumber,
                        startColumn: sel.startColumn,
                        endLineNumber: sel.endLineNumber,
                        endColumn: sel.endColumn
                    });
                }
            }
        });
    }, [onCursorChange, onSelectionChange]);

    // Switch Monaco theme when theme prop changes
    useEffect(() => {
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(theme === 'light' ? 'collabdev-light' : 'collabdev-dark');
        }
    }, [theme]);

    // Update remote cursors decorations
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

        const newDecorations = [];

        // Clear old cursor widgets
        cursorWidgetsRef.current.forEach((widget) => {
            try { editor.removeContentWidget(widget); } catch (e) { }
        });
        cursorWidgetsRef.current.clear();

        Object.entries(cursors).forEach(([userId, cursor]) => {
            if (!cursor.lineNumber) return;
            const color = cursor.color || '#FF6B6B';
            const username = cursor.username || 'User';

            // Cursor line decoration
            newDecorations.push({
                range: new monaco.Range(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column + 1),
                options: {
                    className: `remote-cursor`,
                    beforeContentClassName: `remote-cursor-line`,
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            });

            // Create cursor label widget
            const widgetId = `cursor-widget-${userId}`;
            const widget = {
                getId: () => widgetId,
                getDomNode: () => {
                    const node = document.createElement('div');
                    node.className = 'cursor-label-widget';
                    node.style.background = color;
                    node.style.color = '#fff';
                    node.style.padding = '1px 6px';
                    node.style.borderRadius = '3px';
                    node.style.fontSize = '11px';
                    node.style.fontWeight = '600';
                    node.style.whiteSpace = 'nowrap';
                    node.style.pointerEvents = 'none';
                    node.style.zIndex = '100';
                    node.style.transform = 'translateY(-100%)';
                    node.style.boxShadow = `0 2px 8px ${color}44`;
                    node.textContent = username;
                    return node;
                },
                getPosition: () => ({
                    position: { lineNumber: cursor.lineNumber, column: cursor.column },
                    preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
                })
            };

            editor.addContentWidget(widget);
            cursorWidgetsRef.current.set(userId, widget);

            // Selection highlight
            if (cursor.selection) {
                const sel = cursor.selection;
                newDecorations.push({
                    range: new monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn),
                    options: {
                        className: 'remote-selection',
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                });
            }
        });

        // Inject cursor colors via dynamic styles
        let styleEl = document.getElementById('remote-cursor-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'remote-cursor-styles';
            document.head.appendChild(styleEl);
        }

        let styles = '';
        Object.entries(cursors).forEach(([userId, cursor]) => {
            const color = cursor.color || '#FF6B6B';
            styles += `
        .remote-cursor-line { border-left: 2px solid ${color} !important; }
        .remote-selection { background: ${color}22 !important; }
      `;
        });
        styleEl.textContent = styles;

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    }, [cursors]);

    const handleChange = useCallback((value) => {
        if (!isRemoteUpdate.current) {
            onChange(value || '');
        }
    }, [onChange]);

    return (
        <div className="code-editor">
            <Editor
                height="100%"
                language={language}
                value={value}
                onChange={handleChange}
                onMount={handleEditorDidMount}
                theme="collabdev-dark"
                options={{
                    fontSize,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                    fontLigatures: true,
                    minimap: { enabled: true, scale: 1 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    guides: {
                        bracketPairs: true,
                        indentation: true
                    },
                    suggest: {
                        showWords: true,
                        showSnippets: true
                    },
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: true,
                    wordWrap: 'off',
                    automaticLayout: true,
                    tabSize: 2,
                    renderLineHighlight: 'all',
                    contextmenu: true,
                    quickSuggestions: true,
                    parameterHints: { enabled: true },
                    formatOnPaste: true,
                    formatOnType: true,
                }}
                loading={
                    <div className="editor-loading">
                        <div className="loading-spinner" />
                        <span>Loading Editor...</span>
                    </div>
                }
            />
        </div>
    );
}
