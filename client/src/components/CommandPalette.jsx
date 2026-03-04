import { useState, useEffect, useRef, useCallback } from 'react';

const COMMANDS = [
    { id: 'new-file', icon: '📄', label: 'New File', shortcut: '', category: 'File' },
    { id: 'toggle-terminal', icon: '💻', label: 'Toggle Terminal', shortcut: 'Ctrl+`', category: 'View' },
    { id: 'toggle-sidebar', icon: '📁', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', category: 'View' },
    { id: 'toggle-chat', icon: '💬', label: 'Toggle Chat', shortcut: '', category: 'View' },
    { id: 'copy-room-code', icon: '🔗', label: 'Copy Room Code', shortcut: '', category: 'Room' },
    { id: 'font-increase', icon: '🔠', label: 'Increase Font Size', shortcut: 'Ctrl++', category: 'Editor' },
    { id: 'font-decrease', icon: '🔡', label: 'Decrease Font Size', shortcut: 'Ctrl+-', category: 'Editor' },
    { id: 'format-code', icon: '✨', label: 'Format Document', shortcut: 'Shift+Alt+F', category: 'Editor' },
    { id: 'word-wrap', icon: '↩️', label: 'Toggle Word Wrap', shortcut: 'Alt+Z', category: 'Editor' },
    { id: 'lang-javascript', icon: '🟨', label: 'Switch to JavaScript', shortcut: '', category: 'Language' },
    { id: 'lang-python', icon: '🐍', label: 'Switch to Python', shortcut: '', category: 'Language' },
    { id: 'lang-typescript', icon: '🔷', label: 'Switch to TypeScript', shortcut: '', category: 'Language' },
    { id: 'lang-java', icon: '☕', label: 'Switch to Java', shortcut: '', category: 'Language' },
    { id: 'lang-cpp', icon: '🔷', label: 'Switch to C++', shortcut: '', category: 'Language' },
    { id: 'lang-go', icon: '🐹', label: 'Switch to Go', shortcut: '', category: 'Language' },
    { id: 'lang-rust', icon: '🦀', label: 'Switch to Rust', shortcut: '', category: 'Language' },
    { id: 'lang-html', icon: '🌐', label: 'Switch to HTML', shortcut: '', category: 'Language' },
    { id: 'lang-css', icon: '🎨', label: 'Switch to CSS', shortcut: '', category: 'Language' },
    { id: 'leave-room', icon: '🚪', label: 'Leave Room', shortcut: '', category: 'Room' },
];

export default function CommandPalette({ isOpen, onClose, onExecute }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    const filtered = COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filtered[selectedIndex]) {
            onExecute(filtered[selectedIndex].id);
            onClose();
        }
    }, [filtered, selectedIndex, onClose, onExecute]);

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={(e) => e.stopPropagation()}>
                <div className="palette-input-wrap">
                    <span className="palette-search-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        ref={inputRef}
                        className="palette-input"
                        type="text"
                        placeholder="Type a command..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                    />
                    <span className="palette-shortcut">ESC</span>
                </div>
                <div className="palette-results">
                    {filtered.length === 0 ? (
                        <div className="palette-empty">No commands found</div>
                    ) : (
                        filtered.map((cmd, i) => (
                            <div
                                key={cmd.id}
                                className={`palette-item ${i === selectedIndex ? 'selected' : ''}`}
                                onClick={() => { onExecute(cmd.id); onClose(); }}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <span className="palette-item-icon">{cmd.icon}</span>
                                <span className="palette-item-label">{cmd.label}</span>
                                {cmd.shortcut && <span className="palette-item-shortcut">{cmd.shortcut}</span>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
