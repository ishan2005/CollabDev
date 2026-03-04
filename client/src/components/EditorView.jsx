import { useState, useEffect, useCallback, useRef } from 'react';
import CodeEditor from './CodeEditor';
import Terminal from './Terminal';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import ChatPanel from './ChatPanel';
import CommandPalette from './CommandPalette';
import ToastContainer from './ToastContainer';

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', ext: '.js' },
    { id: 'typescript', name: 'TypeScript', ext: '.ts' },
    { id: 'python', name: 'Python', ext: '.py' },
    { id: 'java', name: 'Java', ext: '.java' },
    { id: 'c', name: 'C', ext: '.c' },
    { id: 'cpp', name: 'C++', ext: '.cpp' },
    { id: 'csharp', name: 'C#', ext: '.cs' },
    { id: 'go', name: 'Go', ext: '.go' },
    { id: 'rust', name: 'Rust', ext: '.rs' },
    { id: 'ruby', name: 'Ruby', ext: '.rb' },
    { id: 'php', name: 'PHP', ext: '.php' },
    { id: 'swift', name: 'Swift', ext: '.swift' },
    { id: 'kotlin', name: 'Kotlin', ext: '.kt' },
    { id: 'html', name: 'HTML', ext: '.html' },
    { id: 'css', name: 'CSS', ext: '.css' },
    { id: 'sql', name: 'SQL', ext: '.sql' },
    { id: 'shell', name: 'Shell', ext: '.sh' },
];

export default function EditorView({ socket, roomId, user, initialState, onLeave, theme, onLogout }) {
    const [files, setFiles] = useState(initialState.files || {});
    const [activeFile, setActiveFile] = useState(initialState.activeFile || Object.keys(initialState.files)[0]);
    const [users, setUsers] = useState(initialState.users || []);
    const [cursors, setCursors] = useState({});
    const [typingUsers, setTypingUsers] = useState({});
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalHeight, setTerminalHeight] = useState(250);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [fontSize, setFontSize] = useState(14);
    const [chatOpen, setChatOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [errorCount, setErrorCount] = useState(0);
    const [runRequest, setRunRequest] = useState(null);
    const isResizing = useRef(false);
    const typingTimeoutRef = useRef(null);
    const terminalRef = useRef(null);

    // Keyboard shortcut: Ctrl+K for command palette
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setPaletteOpen(prev => !prev);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                e.preventDefault();
                setShowTerminal(prev => !prev);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                setSidebarCollapsed(prev => !prev);
            }
            // Ctrl+Enter or F5 to run code
            if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || e.key === 'F5') {
                e.preventDefault();
                handleRunCode();
            }
            // Ctrl+Shift+C to stop
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                handleStopCode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFile, files]);

    // Socket event listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('user-joined', ({ user: newUser, users: allUsers }) => {
            setUsers(allUsers);
        });

        socket.on('user-left', ({ userId, users: allUsers }) => {
            setUsers(allUsers);
            setCursors(prev => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
            setTypingUsers(prev => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        });

        socket.on('code-update', ({ fileName, content, userId }) => {
            setFiles(prev => ({
                ...prev,
                [fileName]: { ...prev[fileName], content }
            }));
        });

        socket.on('cursor-moved', ({ userId, cursor }) => {
            setCursors(prev => ({
                ...prev,
                [userId]: cursor
            }));
        });

        socket.on('selection-changed', ({ userId, selection, color, username }) => {
            setCursors(prev => ({
                ...prev,
                [userId]: { ...prev[userId], selection, color, username }
            }));
        });

        socket.on('user-typing', ({ userId, username, isTyping }) => {
            setTypingUsers(prev => {
                if (isTyping) {
                    return { ...prev, [userId]: username };
                } else {
                    const next = { ...prev };
                    delete next[userId];
                    return next;
                }
            });
        });

        socket.on('file-created', ({ filePath, language }) => {
            setFiles(prev => ({
                ...prev,
                [filePath]: { content: '', language, type: 'file' }
            }));
        });

        socket.on('folder-created', ({ folderPath }) => {
            setFiles(prev => ({
                ...prev,
                [folderPath]: { type: 'folder' }
            }));
        });

        socket.on('file-deleted', ({ filePath, activeFile: newActive }) => {
            setFiles(prev => {
                const next = { ...prev };
                // Delete the path and any children (for folders)
                Object.keys(next).forEach(key => {
                    if (key === filePath || key.startsWith(filePath + '/')) {
                        delete next[key];
                    }
                });
                return next;
            });
            if (newActive) setActiveFile(newActive);
        });

        socket.on('language-changed', ({ fileName, language }) => {
            setFiles(prev => ({
                ...prev,
                [fileName]: { ...prev[fileName], language }
            }));
        });

        socket.on('run-start', () => setIsRunning(true));
        socket.on('run-exit', () => setIsRunning(false));

        return () => {
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('code-update');
            socket.off('cursor-moved');
            socket.off('selection-changed');
            socket.off('user-typing');
            socket.off('file-created');
            socket.off('folder-created');
            socket.off('file-deleted');
            socket.off('language-changed');
            socket.off('run-start');
            socket.off('run-exit');
        };
    }, [socket]);

    const handleCodeChange = useCallback((value) => {
        if (!activeFile) return;
        setFiles(prev => ({
            ...prev,
            [activeFile]: { ...prev[activeFile], content: value }
        }));
        socket.emit('code-change', {
            roomId,
            fileName: activeFile,
            content: value
        });

        // Emit typing indicator
        socket.emit('typing', { roomId, isTyping: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', { roomId, isTyping: false });
        }, 2000);
    }, [socket, roomId, activeFile]);

    const handleCursorChange = useCallback((cursor) => {
        socket.emit('cursor-update', { roomId, cursor: { ...cursor, fileName: activeFile } });
    }, [socket, roomId, activeFile]);

    const handleSelectionChange = useCallback((selection) => {
        socket.emit('selection-update', { roomId, selection: { ...selection, fileName: activeFile } });
    }, [socket, roomId, activeFile]);

    const handleCreateFile = useCallback((filePath, language) => {
        socket.emit('create-file', { roomId, filePath, language });
        setActiveFile(filePath);
    }, [socket, roomId]);

    const handleCreateFolder = useCallback((folderPath) => {
        socket.emit('create-folder', { roomId, folderPath });
    }, [socket, roomId]);

    const handleDeleteFile = useCallback((filePath) => {
        socket.emit('delete-file', { roomId, filePath });
    }, [socket, roomId]);

    const handleSwitchFile = useCallback((fileName) => {
        setActiveFile(fileName);
        socket.emit('switch-file', { roomId, fileName });
    }, [socket, roomId]);

    const handleLanguageChange = useCallback((language) => {
        if (!activeFile) return;
        socket.emit('change-language', { roomId, fileName: activeFile, language });
    }, [socket, roomId, activeFile]);

    // Command palette actions
    const handleCommand = useCallback((commandId) => {
        switch (commandId) {
            case 'toggle-terminal':
                setShowTerminal(prev => !prev);
                break;
            case 'toggle-sidebar':
                setSidebarCollapsed(prev => !prev);
                break;
            case 'toggle-chat':
                setChatOpen(prev => !prev);
                break;
            case 'copy-room-code':
                navigator.clipboard.writeText(roomId);
                break;
            case 'font-increase':
                setFontSize(prev => Math.min(24, prev + 1));
                break;
            case 'font-decrease':
                setFontSize(prev => Math.max(10, prev - 1));
                break;
            case 'leave-room':
                onLeave();
                break;
            default:
                if (commandId.startsWith('lang-')) {
                    const lang = commandId.replace('lang-', '');
                    handleLanguageChange(lang);
                }
                break;
        }
    }, [roomId, onLeave, handleLanguageChange]);

    // ─── Run Code ────────────────────────────────────────────────────────────
    const handleRunCode = useCallback(() => {
        if (!activeFile || !files[activeFile]) return;
        const file = files[activeFile];
        // Auto-open terminal
        setShowTerminal(true);
        setErrorCount(0);
        // Trigger run via runRequest prop
        setRunRequest({
            id: Date.now(),
            fileName: activeFile,
            content: file.content,
            language: file.language || 'javascript'
        });
    }, [activeFile, files]);

    const handleStopCode = useCallback(() => {
        socket.emit('stop-code', { roomId });
    }, [socket, roomId]);

    const handleClearTerminal = useCallback(() => {
        if (terminalRef.current) {
            terminalRef.current.clear();
        }
        setErrorCount(0);
    }, []);

    // Terminal resize
    const handleTerminalResize = useCallback((e) => {
        if (!isResizing.current) return;
        const newHeight = window.innerHeight - e.clientY;
        setTerminalHeight(Math.max(120, Math.min(500, newHeight)));
    }, []);

    const startResize = useCallback((e) => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleTerminalResize);
        document.addEventListener('mouseup', () => {
            isResizing.current = false;
            document.removeEventListener('mousemove', handleTerminalResize);
        }, { once: true });
    }, [handleTerminalResize]);

    const currentFile = files[activeFile];
    const currentLanguage = currentFile?.language || 'javascript';

    // Filter cursors for active file
    const activeCursors = Object.entries(cursors)
        .filter(([userId, c]) => c.fileName === activeFile && userId !== user.id)
        .reduce((acc, [userId, c]) => ({ ...acc, [userId]: c }), {});

    return (
        <div className="editor-view">
            <Toolbar
                roomId={roomId}
                user={user}
                users={users}
                language={currentLanguage}
                languages={LANGUAGES}
                onLanguageChange={handleLanguageChange}
                onToggleTerminal={() => setShowTerminal(!showTerminal)}
                showTerminal={showTerminal}
                onLeave={onLeave}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                activeFile={activeFile}
                onOpenPalette={() => setPaletteOpen(true)}
                typingUsers={typingUsers}
                onRun={handleRunCode}
                onStop={handleStopCode}
                isRunning={isRunning}
                errorCount={errorCount}
            />

            <div className="editor-main">
                <Sidebar
                    files={files}
                    activeFile={activeFile}
                    users={users}
                    user={user}
                    collapsed={sidebarCollapsed}
                    onSwitchFile={handleSwitchFile}
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                    onDeleteFile={handleDeleteFile}
                    languages={LANGUAGES}
                    typingUsers={typingUsers}
                />

                <div className="editor-content">
                    {/* File tabs — only files, not folders */}
                    <div className="file-tabs">
                        {Object.entries(files)
                            .filter(([, f]) => f.type === 'file')
                            .map(([path, file]) => {
                                const name = path.split('/').pop();
                                return (
                                    <button
                                        key={path}
                                        className={`file-tab ${path === activeFile ? 'active' : ''}`}
                                        onClick={() => handleSwitchFile(path)}
                                        title={path}
                                    >
                                        <span className="tab-name">{name}</span>
                                        <span
                                            className="tab-close"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFile(path); }}
                                        >×</span>
                                    </button>
                                );
                            })}
                    </div>

                    {/* Editor */}
                    <div className="editor-wrapper" style={{ height: showTerminal ? `calc(100% - ${terminalHeight}px)` : '100%' }}>
                        {activeFile && currentFile && (
                            <CodeEditor
                                value={currentFile.content}
                                language={currentLanguage}
                                onChange={handleCodeChange}
                                onCursorChange={handleCursorChange}
                                onSelectionChange={handleSelectionChange}
                                cursors={activeCursors}
                                fontSize={fontSize}
                                fileName={activeFile}
                                theme={theme}
                            />
                        )}
                    </div>

                    {/* Terminal */}
                    {showTerminal && (
                        <>
                            <div className="terminal-resize-handle" onMouseDown={startResize} />
                            <div className="terminal-panel" style={{ height: terminalHeight }}>
                                <div className="terminal-header">
                                    <span className="terminal-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                                        </svg>
                                        Terminal
                                        {errorCount > 0 && (
                                            <span className="terminal-error-badge">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
                                        )}
                                        {isRunning && (
                                            <span className="terminal-running-indicator">
                                                <span className="running-dot" /> Running
                                            </span>
                                        )}
                                    </span>
                                    <div className="terminal-actions">
                                        <button className="terminal-action-btn" onClick={handleClearTerminal} title="Clear Terminal">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6" />
                                            </svg>
                                        </button>
                                        <button className="terminal-close" onClick={() => setShowTerminal(false)}>×</button>
                                    </div>
                                </div>
                                <Terminal ref={terminalRef} socket={socket} roomId={roomId} runRequest={runRequest} onErrorCount={setErrorCount} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Toast notifications */}
            <ToastContainer socket={socket} />

            {/* Chat panel */}
            <ChatPanel
                socket={socket}
                roomId={roomId}
                user={user}
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                onToggle={() => setChatOpen(!chatOpen)}
            />

            {/* Command palette */}
            <CommandPalette
                isOpen={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                onExecute={handleCommand}
            />
        </div>
    );
}
