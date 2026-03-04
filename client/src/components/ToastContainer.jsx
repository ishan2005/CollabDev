import { useState, useEffect, useCallback } from 'react';

export default function ToastContainer({ socket }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((toast) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { ...toast, id }]);

        // Auto remove after 4s
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, fading: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 300);
        }, 4000);
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('user-joined', ({ user }) => {
            addToast({ icon: '👋', text: `<strong>${user.username}</strong> joined the room` });
        });

        socket.on('user-left', ({ userId }) => {
            addToast({ icon: '🚪', text: `A collaborator left the room` });
        });

        socket.on('file-created', ({ fileName }) => {
            addToast({ icon: '📄', text: `New file created: <strong>${fileName}</strong>` });
        });

        socket.on('file-deleted', ({ fileName }) => {
            addToast({ icon: '🗑️', text: `File deleted: <strong>${fileName}</strong>` });
        });

        socket.on('language-changed', ({ fileName, language }) => {
            addToast({ icon: '🎨', text: `<strong>${fileName}</strong> → ${language}` });
        });

        return () => {
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('file-created');
            socket.off('file-deleted');
            socket.off('language-changed');
        };
    }, [socket, addToast]);

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast ${toast.fading ? 'fade-out' : ''}`}>
                    <span className="toast-icon">{toast.icon}</span>
                    <span className="toast-text" dangerouslySetInnerHTML={{ __html: toast.text }} />
                </div>
            ))}
        </div>
    );
}
