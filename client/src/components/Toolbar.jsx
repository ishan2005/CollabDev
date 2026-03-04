import { useState } from 'react';

export default function Toolbar({
    roomId, user, users, language, languages, onLanguageChange,
    onToggleTerminal, showTerminal, onLeave, fontSize, onFontSizeChange,
    onToggleSidebar, activeFile, onOpenPalette, typingUsers,
    onRun, onStop, isRunning, errorCount
}) {
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const typingNames = Object.values(typingUsers || {});

    return (
        <div className="toolbar">
            <div className="toolbar-left">
                <button className="icon-btn sidebar-toggle" onClick={onToggleSidebar} title="Toggle Sidebar (Ctrl+B)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="15" y2="12" />
                        <line x1="3" y1="18" x2="18" y2="18" />
                    </svg>
                </button>
                <div className="toolbar-logo">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                        <rect x="3" y="3" width="8" height="8" rx="2" fill="#00F5FF" opacity="0.9" />
                        <rect x="13" y="3" width="8" height="8" rx="2" fill="#B14EFF" opacity="0.8" />
                        <rect x="3" y="13" width="8" height="8" rx="2" fill="#FF00E5" opacity="0.6" />
                        <rect x="13" y="13" width="8" height="8" rx="2" fill="#00F5FF" opacity="0.9" />
                    </svg>
                    <span>CollabDev</span>
                </div>
            </div>

            <div className="toolbar-center">
                <div className="room-info">
                    <span className="room-label">Room</span>
                    <button className="room-code" onClick={copyRoomCode} title="Click to copy room code">
                        <span>{roomId}</span>
                        {copied ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF94" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Language selector */}
                <select
                    className="language-select"
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                >
                    {languages.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>

                {/* Typing indicator */}
                {typingNames.length > 0 && (
                    <div className="toolbar-typing">
                        <div className="typing-indicator">
                            <span className="dot" /><span className="dot" /><span className="dot" />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            {typingNames.length === 1
                                ? `${typingNames[0]} is typing`
                                : `${typingNames.length} people typing`}
                        </span>
                    </div>
                )}
            </div>

            <div className="toolbar-right">
                {/* Connected users avatars */}
                <div className="user-avatars">
                    {users.slice(0, 5).map(u => (
                        <div
                            key={u.id}
                            className="mini-avatar"
                            style={{ background: u.color }}
                            title={u.username}
                        >
                            {u.username.charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {users.length > 5 && (
                        <div className="mini-avatar more">+{users.length - 5}</div>
                    )}
                </div>

                {/* Command palette */}
                <button className="icon-btn" onClick={onOpenPalette} title="Command Palette (Ctrl+K)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </button>

                {/* Settings */}
                <div className="settings-dropdown">
                    <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>
                    {showSettings && (
                        <div className="dropdown-menu">
                            <div className="dropdown-item font-size-control">
                                <span>Font Size</span>
                                <div className="font-size-btns">
                                    <button onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}>−</button>
                                    <span>{fontSize}px</span>
                                    <button onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}>+</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Run / Stop button */}
                {isRunning ? (
                    <button className="btn-run btn-stop" onClick={onStop} title="Stop Running (Ctrl+Shift+C)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                        <span>Stop</span>
                    </button>
                ) : (
                    <button className="btn-run" onClick={onRun} title="Run Code (Ctrl+Enter)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Run</span>
                    </button>
                )}

                {/* Terminal toggle */}
                <button
                    className={`icon-btn ${showTerminal ? 'active' : ''}`}
                    onClick={onToggleTerminal}
                    title="Toggle Terminal (Ctrl+`)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    {errorCount > 0 && (
                        <span className="error-badge">{errorCount}</span>
                    )}
                </button>

                {/* Leave room */}
                <button className="btn-leave" onClick={onLeave} title="Leave Room">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Leave</span>
                </button>
            </div>
        </div>
    );
}
