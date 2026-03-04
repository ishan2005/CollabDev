import { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', ext: '.js', icon: '🟨' },
    { id: 'typescript', name: 'TypeScript', ext: '.ts', icon: '🔷' },
    { id: 'python', name: 'Python', ext: '.py', icon: '🐍' },
    { id: 'java', name: 'Java', ext: '.java', icon: '☕' },
    { id: 'c', name: 'C', ext: '.c', icon: '🔵' },
    { id: 'cpp', name: 'C++', ext: '.cpp', icon: '🔷' },
    { id: 'csharp', name: 'C#', ext: '.cs', icon: '💜' },
    { id: 'go', name: 'Go', ext: '.go', icon: '🐹' },
    { id: 'rust', name: 'Rust', ext: '.rs', icon: '🦀' },
    { id: 'ruby', name: 'Ruby', ext: '.rb', icon: '💎' },
    { id: 'php', name: 'PHP', ext: '.php', icon: '🐘' },
    { id: 'swift', name: 'Swift', ext: '.swift', icon: '🦅' },
    { id: 'kotlin', name: 'Kotlin', ext: '.kt', icon: '🟣' },
    { id: 'html', name: 'HTML', ext: '.html', icon: '🌐' },
    { id: 'css', name: 'CSS', ext: '.css', icon: '🎨' },
    { id: 'sql', name: 'SQL', ext: '.sql', icon: '🗃️' },
    { id: 'shell', name: 'Shell', ext: '.sh', icon: '🐚' },
];

export default function LandingPage({ onJoinRoom, activeRooms, roomHistory, onClearHistory, onRejoinHistory, username: loggedInUser, onLogout }) {
    const [mode, setMode] = useState(null);
    const [username, setUsername] = useState(() => loggedInUser || localStorage.getItem('collabdev-username') || '');
    const [roomCode, setRoomCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const particlesRef = useRef(null);

    useEffect(() => {
        const canvas = particlesRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['0, 168, 132', '37, 211, 102', '83, 189, 235', '0, 128, 105'];
        const particles = [];
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2.5 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.3 + 0.05,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        let animId;
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
                ctx.fill();
            });

            particles.forEach((a, i) => {
                particles.slice(i + 1).forEach(b => {
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 130) {
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(0, 168, 132, ${0.05 * (1 - dist / 130)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            });
            animId = requestAnimationFrame(animate);
        }
        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username.trim()) return;
        if (mode === 'join' && !roomCode.trim()) return;

        localStorage.setItem('collabdev-username', username.trim());
        setIsLoading(true);
        onJoinRoom({
            roomId: roomCode.trim(),
            username: username.trim(),
            isNew: mode === 'create'
        });
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const activeRoomIds = Object.keys(activeRooms || {});

    return (
        <div className="landing-page">
            <canvas ref={particlesRef} className="particles-canvas" />

            <div className="landing-content">
                {/* Header */}
                <div className="landing-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <svg viewBox="0 0 40 40" fill="none">
                                <rect x="4" y="4" width="14" height="14" rx="3" fill="#00A884" opacity="0.9" />
                                <rect x="22" y="4" width="14" height="14" rx="3" fill="#25D366" opacity="0.7" />
                                <rect x="4" y="22" width="14" height="14" rx="3" fill="#53BDEB" opacity="0.5" />
                                <rect x="22" y="22" width="14" height="14" rx="3" fill="#00A884" opacity="0.9" />
                                <circle cx="20" cy="20" r="5" fill="#fff" opacity="0.9" />
                            </svg>
                        </div>
                        <span className="logo-text">CollabDev</span>
                    </div>
                    <p className="landing-tagline">Real-Time Collaborative Code Editor</p>
                    {loggedInUser && onLogout && (
                        <div className="landing-user-info">
                            <span className="landing-welcome">Welcome, <strong>{loggedInUser}</strong></span>
                            <button className="landing-signout" onClick={onLogout}>Sign Out</button>
                        </div>
                    )}
                </div>

                {/* Active rooms — quick rejoin */}
                {activeRoomIds.length > 0 && (
                    <div className="active-rooms-panel">
                        <div className="active-rooms-title">🟢 Active Rooms</div>
                        <div className="active-rooms-list">
                            {activeRoomIds.map(rId => (
                                <div
                                    key={rId}
                                    className="active-room-card"
                                    onClick={() => onJoinRoom({ roomId: rId, username: activeRooms[rId].user?.username || username, isNew: false, rejoin: true })}
                                >
                                    <div className="active-room-dot" />
                                    <div className="active-room-info">
                                        <div className="active-room-code">{rId}</div>
                                        <div className="active-room-meta">
                                            as {activeRooms[rId].user?.username} • {activeRooms[rId].roomState?.users?.length || 1} online
                                        </div>
                                    </div>
                                    <button className="active-room-rejoin" onClick={(e) => e.stopPropagation()}>
                                        Rejoin →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feature cards */}
                <div className="features-row">
                    <div className="feature-card"><span className="feature-icon">⚡</span><span className="feature-label">Real-Time Sync</span></div>
                    <div className="feature-card"><span className="feature-icon">👥</span><span className="feature-label">Live Cursors</span></div>
                    <div className="feature-card"><span className="feature-icon">🎨</span><span className="feature-label">15+ Languages</span></div>
                    <div className="feature-card"><span className="feature-icon">💻</span><span className="feature-label">Terminal</span></div>
                </div>

                {/* Action panel */}
                {!mode ? (
                    <div className="action-panel">
                        <h2>Start Collaborating</h2>
                        <p className="action-subtitle">Create a new room or join an existing session</p>
                        <div className="action-buttons">
                            <button className="btn btn-primary" onClick={() => setMode('create')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Create Room
                            </button>
                            <button className="btn btn-secondary" onClick={() => setMode('join')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                    <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                                </svg>
                                Join Room
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="action-panel form-panel" onSubmit={handleSubmit}>
                        <button className="back-btn" type="button" onClick={() => { setMode(null); setIsLoading(false); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                            </svg>
                            Back
                        </button>
                        <h2>{mode === 'create' ? 'Create New Room' : 'Join a Room'}</h2>

                        <div className="form-group">
                            <label htmlFor="username">Your Name</label>
                            <input
                                id="username" type="text" placeholder="Enter your name"
                                value={username} onChange={(e) => setUsername(e.target.value)}
                                autoFocus maxLength={20}
                            />
                        </div>

                        {mode === 'join' && (
                            <div className="form-group">
                                <label htmlFor="roomcode">Room Code</label>
                                <input
                                    id="roomcode" type="text" placeholder="Enter room code"
                                    value={roomCode} onChange={(e) => setRoomCode(e.target.value)} maxLength={10}
                                />
                            </div>
                        )}

                        <button className="btn btn-primary btn-full" type="submit"
                            disabled={isLoading || !username.trim() || (mode === 'join' && !roomCode.trim())}>
                            {isLoading ? <span className="spinner" /> : mode === 'create' ? '🚀 Create & Enter Room' : '🔗 Join Room'}
                        </button>
                    </form>
                )}

                {/* Room History */}
                {roomHistory && roomHistory.length > 0 && (
                    <div className="room-history-panel">
                        <div className="room-history-header">
                            <span className="room-history-title">📋 Room History</span>
                            <button className="history-clear-btn" onClick={onClearHistory}>Clear</button>
                        </div>
                        <div className="room-history-list">
                            {roomHistory.slice(0, 8).map((item, i) => (
                                <div key={i} className="history-item" onClick={() => {
                                    setRoomCode(item.roomId);
                                    setUsername(item.username || username);
                                    setMode('join');
                                }}>
                                    <span className="history-icon">🕐</span>
                                    <div className="history-info">
                                        <div className="history-room-code">{item.roomId}</div>
                                        <div className="history-details">
                                            <span>as {item.username}</span>
                                            <span>{formatTime(item.joinedAt)}</span>
                                        </div>
                                    </div>
                                    <button className="history-rejoin-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        onRejoinHistory(item);
                                    }}>Join</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Languages showcase */}
                <div className="languages-showcase">
                    <p className="languages-title">Supported Languages</p>
                    <div className="languages-scroll">
                        {LANGUAGES.map(lang => (
                            <span key={lang.id} className="lang-badge"><span>{lang.icon}</span> {lang.name}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
