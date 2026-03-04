import { useState, useMemo } from 'react';

const FILE_ICONS = {
    js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
    py: '🐍', java: '☕', c: '🔵', cpp: '🔷',
    cs: '💜', go: '🐹', rs: '🦀', rb: '💎',
    php: '🐘', swift: '🦅', kt: '🟣', html: '🌐',
    css: '🎨', sql: '🗃️', sh: '🐚', md: '📝',
    json: '📋', txt: '📄'
};

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return FILE_ICONS[ext] || '📄';
}

// Build a tree structure from flat paths
function buildFileTree(files) {
    const tree = { name: '/', path: '/', type: 'folder', children: {} };

    Object.entries(files).forEach(([path, data]) => {
        const parts = path.split('/').filter(Boolean);
        let current = tree;

        parts.forEach((part, i) => {
            if (!current.children[part]) {
                const fullPath = '/' + parts.slice(0, i + 1).join('/');
                current.children[part] = {
                    name: part,
                    path: fullPath,
                    type: i === parts.length - 1 ? data.type : 'folder',
                    children: {},
                    ...(data.type === 'file' && i === parts.length - 1 ? { language: data.language } : {})
                };
            }
            if (i === parts.length - 1 && data.type === 'file') {
                current.children[part].language = data.language;
                current.children[part].type = 'file';
            }
            current = current.children[part];
        });
    });

    return tree;
}

function TreeNode({ node, activeFile, onSwitchFile, onDeleteFile, onCreateFile, onCreateFolder, languages, depth = 0 }) {
    const [expanded, setExpanded] = useState(true);
    const [showNewItem, setShowNewItem] = useState(null); // 'file' | 'folder' | null
    const [newName, setNewName] = useState('');
    const [newLang, setNewLang] = useState('javascript');

    const sortedChildren = useMemo(() => {
        return Object.values(node.children).sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    }, [node.children]);

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        const parentPath = node.path === '/' ? '' : node.path;
        if (showNewItem === 'folder') {
            onCreateFolder(`${parentPath}/${newName.trim()}`);
        } else {
            const lang = languages.find(l => l.id === newLang);
            const ext = lang?.ext || '.txt';
            let name = newName.trim();
            if (!name.includes('.')) name += ext;
            onCreateFile(`${parentPath}/${name}`, newLang);
        }
        setNewName('');
        setShowNewItem(null);
    };

    if (node.type === 'file') {
        return (
            <div
                className={`tree-file ${node.path === activeFile ? 'active' : ''}`}
                style={{ paddingLeft: depth * 16 + 12 }}
                onClick={() => onSwitchFile(node.path)}
            >
                <span className="tree-file-icon">{getFileIcon(node.name)}</span>
                <span className="tree-file-name">{node.name}</span>
                {node.language && <span className="file-lang-badge">{node.language}</span>}
                <span
                    className="tree-delete"
                    onClick={(e) => { e.stopPropagation(); onDeleteFile(node.path); }}
                    title="Delete"
                >×</span>
            </div>
        );
    }

    // Folder
    return (
        <div className="tree-folder">
            {node.path !== '/' && (
                <div
                    className="tree-folder-header"
                    style={{ paddingLeft: depth * 16 + 12 }}
                    onClick={() => setExpanded(!expanded)}
                >
                    <span className={`tree-arrow ${expanded ? 'expanded' : ''}`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </span>
                    <span className="tree-folder-icon">📁</span>
                    <span className="tree-folder-name">{node.name}</span>
                    <div className="tree-folder-actions">
                        <button className="tree-action-btn" onClick={(e) => { e.stopPropagation(); setShowNewItem('file'); }} title="New File">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                        </button>
                        <button className="tree-action-btn" onClick={(e) => { e.stopPropagation(); setShowNewItem('folder'); }} title="New Folder">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                            </svg>
                        </button>
                        <button className="tree-action-btn delete" onClick={(e) => { e.stopPropagation(); onDeleteFile(node.path); }} title="Delete Folder">×</button>
                    </div>
                </div>
            )}

            {/* New item form inside folder */}
            {showNewItem && (
                <form className="tree-new-form" style={{ paddingLeft: (depth + 1) * 16 + 12 }} onSubmit={handleCreate}>
                    <input
                        type="text"
                        placeholder={showNewItem === 'folder' ? 'folder name' : 'file name'}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                        className="tree-new-input"
                        onKeyDown={(e) => e.key === 'Escape' && setShowNewItem(null)}
                    />
                    {showNewItem === 'file' && (
                        <select value={newLang} onChange={(e) => setNewLang(e.target.value)} className="tree-new-select">
                            {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    )}
                    <div className="tree-new-actions">
                        <button type="submit" className="btn-small btn-accent">OK</button>
                        <button type="button" className="btn-small btn-ghost" onClick={() => setShowNewItem(null)}>✕</button>
                    </div>
                </form>
            )}

            {expanded && sortedChildren.map(child => (
                <TreeNode
                    key={child.path}
                    node={child}
                    activeFile={activeFile}
                    onSwitchFile={onSwitchFile}
                    onDeleteFile={onDeleteFile}
                    onCreateFile={onCreateFile}
                    onCreateFolder={onCreateFolder}
                    languages={languages}
                    depth={node.path === '/' ? depth : depth + 1}
                />
            ))}
        </div>
    );
}

export default function Sidebar({ files, activeFile, users, user, collapsed, onSwitchFile, onCreateFile, onDeleteFile, onCreateFolder, languages, typingUsers }) {
    const [showNewRoot, setShowNewRoot] = useState(null);
    const [newRootName, setNewRootName] = useState('');
    const [newRootLang, setNewRootLang] = useState('javascript');

    const fileTree = useMemo(() => buildFileTree(files), [files]);

    const handleRootCreate = (e) => {
        e.preventDefault();
        if (!newRootName.trim()) return;
        if (showNewRoot === 'folder') {
            onCreateFolder('/' + newRootName.trim());
        } else {
            const lang = languages.find(l => l.id === newRootLang);
            const ext = lang?.ext || '.txt';
            let name = newRootName.trim();
            if (!name.includes('.')) name += ext;
            onCreateFile('/' + name, newRootLang);
        }
        setNewRootName('');
        setShowNewRoot(null);
    };

    if (collapsed) return null;

    return (
        <div className="sidebar">
            {/* Files section */}
            <div className="sidebar-section">
                <div className="sidebar-section-header">
                    <span className="section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        Explorer
                    </span>
                    <div style={{ display: 'flex', gap: 2 }}>
                        <button className="icon-btn" onClick={() => setShowNewRoot('file')} title="New File" style={{ width: 26, height: 26 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                        </button>
                        <button className="icon-btn" onClick={() => setShowNewRoot('folder')} title="New Folder" style={{ width: 26, height: 26 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                            </svg>
                        </button>
                    </div>
                </div>

                {showNewRoot && (
                    <form className="tree-new-form" style={{ paddingLeft: 12 }} onSubmit={handleRootCreate}>
                        <input
                            type="text"
                            placeholder={showNewRoot === 'folder' ? 'folder name' : 'file name'}
                            value={newRootName}
                            onChange={(e) => setNewRootName(e.target.value)}
                            autoFocus
                            className="tree-new-input"
                            onKeyDown={(e) => e.key === 'Escape' && setShowNewRoot(null)}
                        />
                        {showNewRoot === 'file' && (
                            <select value={newRootLang} onChange={(e) => setNewRootLang(e.target.value)} className="tree-new-select">
                                {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        )}
                        <div className="tree-new-actions">
                            <button type="submit" className="btn-small btn-accent">OK</button>
                            <button type="button" className="btn-small btn-ghost" onClick={() => setShowNewRoot(null)}>✕</button>
                        </div>
                    </form>
                )}

                <div className="file-tree">
                    <TreeNode
                        node={fileTree}
                        activeFile={activeFile}
                        onSwitchFile={onSwitchFile}
                        onDeleteFile={onDeleteFile}
                        onCreateFile={onCreateFile}
                        onCreateFolder={onCreateFolder}
                        languages={languages}
                    />
                </div>
            </div>

            {/* Users section */}
            <div className="sidebar-section">
                <div className="sidebar-section-header">
                    <span className="section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Online ({users.length})
                    </span>
                </div>
                <div className="users-list">
                    {users.map(u => (
                        <div key={u.id} className="user-item">
                            <div className="user-avatar" style={{ background: u.color }}>
                                {u.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="user-name">
                                {u.username}
                                {u.id === user.id && <span className="you-badge">you</span>}
                            </span>
                            {typingUsers && typingUsers[u.id] ? (
                                <div className="typing-indicator">
                                    <span className="dot" /><span className="dot" /><span className="dot" />
                                </div>
                            ) : (
                                <span className="user-status online" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Keyboard shortcuts */}
            <div className="sidebar-section">
                <div className="sidebar-section-header">
                    <span className="section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <line x1="6" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="10" y2="8" />
                        </svg>
                        Shortcuts
                    </span>
                </div>
                <div className="shortcuts-list">
                    <div className="shortcut-item"><span>Command Palette</span><kbd>Ctrl+K</kbd></div>
                    <div className="shortcut-item"><span>Toggle Terminal</span><kbd>Ctrl+`</kbd></div>
                    <div className="shortcut-item"><span>Toggle Sidebar</span><kbd>Ctrl+B</kbd></div>
                </div>
            </div>
        </div>
    );
}
