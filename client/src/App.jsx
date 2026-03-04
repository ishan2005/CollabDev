import { useState, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import EditorView from './components/EditorView';
import './index.css';

const SOCKET_URL = 'http://localhost:3001';

// Room history helpers
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('collabdev-history') || '[]');
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem('collabdev-history', JSON.stringify(history.slice(0, 50)));
}

function addToHistory(roomId, username) {
  const history = loadHistory();
  // Remove duplicates
  const filtered = history.filter(h => h.roomId !== roomId);
  filtered.unshift({ roomId, username, joinedAt: Date.now() });
  saveHistory(filtered);
  return filtered;
}

function App() {
  const [rooms, setRooms] = useState({});
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [roomHistory, setRoomHistory] = useState(loadHistory);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem('collabdev-session') || 'null');
      return session?.loggedIn === true;
    } catch { return false; }
  });
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem('collabdev-session') || 'null');
      return session?.username || '';
    } catch { return ''; }
  });

  const handleLogin = useCallback(({ username }) => {
    setIsLoggedIn(true);
    setLoggedInUser(username);
    localStorage.setItem('collabdev-session', JSON.stringify({
      username, loggedIn: true, timestamp: Date.now()
    }));
    localStorage.setItem('collabdev-username', username);
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setLoggedInUser('');
    localStorage.removeItem('collabdev-session');
    // Disconnect socket and clear rooms
    if (socket) socket.disconnect();
    setSocket(null);
    setRooms({});
    setActiveRoomId(null);
  }, [socket]);

  // Theme management
  const [theme, setTheme] = useState(() => localStorage.getItem('collabdev-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('collabdev-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const getOrCreateSocket = useCallback(() => {
    if (socket && socket.connected) return socket;
    const newSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);
    return newSocket;
  }, [socket]);

  const handleJoinRoom = useCallback(({ roomId: rId, username, isNew, rejoin }) => {
    // If rejoining an active room, just switch to it
    if (rejoin && rooms[rId]) {
      setActiveRoomId(rId);
      return;
    }

    const sock = getOrCreateSocket();

    const doJoin = (targetRoomId) => {
      sock.emit('join-room', { roomId: targetRoomId, username }, (data) => {
        if (data.success) {
          setRooms(prev => ({
            ...prev,
            [targetRoomId]: { user: data.user, roomState: data }
          }));
          setActiveRoomId(targetRoomId);
          const updated = addToHistory(targetRoomId, username);
          setRoomHistory(updated);
        }
      });
    };

    sock.on('connect', () => {
      if (isNew) {
        sock.emit('create-room', (response) => doJoin(response.roomId));
      } else {
        doJoin(rId);
      }
    });

    if (sock.connected) {
      if (isNew) {
        sock.emit('create-room', (response) => doJoin(response.roomId));
      } else {
        doJoin(rId);
      }
    }
  }, [getOrCreateSocket, rooms]);

  const handleLeaveRoom = useCallback((roomId) => {
    if (socket) socket.emit('leave-room', { roomId });
    setRooms(prev => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
    const remaining = Object.keys(rooms).filter(id => id !== roomId);
    setActiveRoomId(remaining.length > 0 ? remaining[0] : null);
  }, [socket, rooms]);

  const handleSwitchRoom = useCallback((roomId) => {
    setActiveRoomId(roomId);
  }, []);

  const handleClearHistory = useCallback(() => {
    localStorage.removeItem('collabdev-history');
    setRoomHistory([]);
  }, []);

  const handleRejoinHistory = useCallback((item) => {
    handleJoinRoom({ roomId: item.roomId, username: item.username, isNew: false });
  }, [handleJoinRoom]);

  const roomIds = Object.keys(rooms);
  const hasRooms = roomIds.length > 0 && activeRoomId;

  // Theme toggle button (always visible)
  const themeToggle = (
    <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );

  // Show login page if not logged in
  if (!isLoggedIn) {
    return (
      <>
        {themeToggle}
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  if (!hasRooms) {
    return (
      <>
        {themeToggle}
        <LandingPage
          onJoinRoom={handleJoinRoom}
          activeRooms={rooms}
          roomHistory={roomHistory}
          onClearHistory={handleClearHistory}
          onRejoinHistory={handleRejoinHistory}
          username={loggedInUser}
          onLogout={handleLogout}
        />
      </>
    );
  }

  const activeRoom = rooms[activeRoomId];

  return (
    <div className="app-multi-room">
      {themeToggle}

      {roomIds.length > 0 && (
        <div className="room-tabs-bar">
          {roomIds.map(rId => (
            <button key={rId} className={`room-tab ${rId === activeRoomId ? 'active' : ''}`}
              onClick={() => handleSwitchRoom(rId)}>
              <span className="room-tab-dot" style={{ background: rooms[rId].user.color }} />
              <span className="room-tab-id">{rId}</span>
              <span className="room-tab-close" onClick={(e) => { e.stopPropagation(); handleLeaveRoom(rId); }}>×</span>
            </button>
          ))}
          <button className="room-tab add-room" onClick={() => setActiveRoomId(null)} title="Join another room">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}

      {!activeRoomId ? (
        <LandingPage
          onJoinRoom={handleJoinRoom}
          activeRooms={rooms}
          roomHistory={roomHistory}
          onClearHistory={handleClearHistory}
          onRejoinHistory={handleRejoinHistory}
        />
      ) : (
        <EditorView
          key={activeRoomId}
          socket={socket}
          roomId={activeRoomId}
          user={activeRoom.user}
          initialState={activeRoom.roomState}
          onLeave={() => handleLeaveRoom(activeRoomId)}
          theme={theme}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
