import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ socket, roomId, user, isOpen, onClose, onToggle }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('chat-message', (msg) => {
            setMessages(prev => [...prev, msg]);
            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }
        });

        socket.on('chat-system', (msg) => {
            setMessages(prev => [...prev, { ...msg, isSystem: true }]);
        });

        return () => {
            socket.off('chat-message');
            socket.off('chat-system');
        };
    }, [socket, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isOpen, messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        socket.emit('chat-send', {
            roomId,
            text: input.trim(),
            username: user.username,
            color: user.color,
            timestamp: Date.now()
        });
        setInput('');
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) {
        return (
            <button className="chat-toggle" onClick={onToggle} title="Team Chat">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
        );
    }

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div className="chat-header-title">
                    <span className="chat-icon">💬</span>
                    Team Chat
                </div>
                <button className="icon-btn" onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-system">No messages yet. Say hello! 👋</div>
                )}
                {messages.map((msg, i) => (
                    msg.isSystem ? (
                        <div key={i} className="chat-system">{msg.text}</div>
                    ) : (
                        <div key={i} className="chat-message">
                            <div className="chat-msg-avatar" style={{ background: msg.color }}>
                                {msg.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="chat-msg-content">
                                <div className="chat-msg-header">
                                    <span className="chat-msg-name" style={{ color: msg.color }}>{msg.username}</span>
                                    <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                                </div>
                                <div className="chat-msg-text">{msg.text}</div>
                            </div>
                        </div>
                    )
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
                <input
                    className="chat-input"
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={500}
                />
                <button className="chat-send" type="submit" disabled={!input.trim()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
