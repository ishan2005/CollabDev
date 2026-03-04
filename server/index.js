import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json());

// ─── User Store (JSON file) ──────────────────────────────────────────────────
const USERS_FILE = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'users.json');

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        }
    } catch (e) { console.error('Error loading users:', e); }
    return {};
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch (e) { console.error('Error saving users:', e); }
}

// ─── Auth Endpoints ──────────────────────────────────────────────────────────

// Sign Up
app.post('/auth/signup', async (req, res) => {
    const { username, password, email, securityQuestion, securityAnswer } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.trim().length < 2) {
        return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }
    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const users = loadUsers();
    const userKey = username.trim().toLowerCase();

    if (users[userKey]) {
        return res.status(409).json({ error: 'Username already exists. Please choose another.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    users[userKey] = {
        username: username.trim(),
        password: hashedPassword,
        email: email || '',
        securityQuestion: securityQuestion || '',
        securityAnswer: securityAnswer ? await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10) : '',
        createdAt: Date.now()
    };

    saveUsers(users);
    res.json({ success: true, username: username.trim() });
});

// Login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = loadUsers();
    const userKey = username.trim().toLowerCase();
    const user = users[userKey];

    if (!user) {
        return res.status(401).json({ error: 'Account not found. Please sign up first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    res.json({ success: true, username: user.username });
});

// Forgot Password — Step 1: Get security question
app.post('/auth/forgot-password', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Please enter your username' });
    }

    const users = loadUsers();
    const userKey = username.trim().toLowerCase();
    const user = users[userKey];

    if (!user) {
        return res.status(404).json({ error: 'No account found with that username' });
    }

    if (!user.securityQuestion) {
        return res.status(400).json({ error: 'No security question set for this account. Contact support.' });
    }

    res.json({ success: true, securityQuestion: user.securityQuestion, username: user.username });
});

// Reset Password — Step 2: Verify answer and set new password
app.post('/auth/reset-password', async (req, res) => {
    const { username, securityAnswer, newPassword } = req.body;

    if (!username || !securityAnswer || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    const users = loadUsers();
    const userKey = username.trim().toLowerCase();
    const user = users[userKey];

    if (!user) {
        return res.status(404).json({ error: 'Account not found' });
    }

    const isMatch = await bcrypt.compare(securityAnswer.toLowerCase().trim(), user.securityAnswer);
    if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect security answer. Please try again.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    saveUsers(users);

    res.json({ success: true, message: 'Password reset successfully! You can now sign in.' });
});

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ─── Room State ──────────────────────────────────────────────────────────────
const rooms = new Map();

function createRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            // Tree-based file system: { path: { content, language, type: 'file'|'folder' } }
            files: {
                '/main.js': {
                    content: '// Welcome to CollabDev! Start coding collaboratively.\nconsole.log("Hello, World!");\n',
                    language: 'javascript',
                    type: 'file'
                },
                '/src': {
                    type: 'folder'
                },
                '/src/index.js': {
                    content: '// Entry point\nimport { app } from "./app.js";\n\napp.start();\n',
                    language: 'javascript',
                    type: 'file'
                },
                '/src/app.js': {
                    content: '// Application logic\nexport const app = {\n  start() {\n    console.log("App started!");\n  }\n};\n',
                    language: 'javascript',
                    type: 'file'
                }
            },
            activeFile: '/main.js',
            users: new Map(),
            cursors: new Map(),
            terminals: new Map()
        });
    }
    return rooms.get(roomId);
}

function getRandomColor() {
    const colors = [
        '#00A884', '#25D366', '#53BDEB', '#008069', '#4E8AFF',
        '#F0B90B', '#EA4335', '#B14EFF', '#14B8A6', '#EC4899',
        '#F97316', '#06B6D4', '#8B5CF6', '#10B981', '#3B82F6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ─── Socket.IO Events ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Track which rooms this socket is in
    socket.roomIds = new Set();

    // Create a new room
    socket.on('create-room', (callback) => {
        const roomId = uuidv4().substring(0, 8);
        createRoom(roomId);
        callback({ roomId });
    });

    // Join an existing room (supports multiple rooms per user)
    socket.on('join-room', ({ roomId, username }, callback) => {
        const room = createRoom(roomId);
        const userColor = getRandomColor();

        const user = {
            id: socket.id,
            username: username || `User-${socket.id.substring(0, 4)}`,
            color: userColor,
            joinedAt: Date.now()
        };

        room.users.set(socket.id, user);
        socket.join(roomId);
        socket.roomIds.add(roomId);
        socket.userData = socket.userData || {};
        socket.userData[roomId] = user;

        // Send current room state to the joining user
        const usersArray = Array.from(room.users.values());
        const cursorsArray = Array.from(room.cursors.entries()).map(([id, cursor]) => ({
            ...cursor,
            userId: id
        }));

        callback({
            success: true,
            files: room.files,
            activeFile: room.activeFile,
            users: usersArray,
            cursors: cursorsArray,
            user
        });

        // Notify others
        socket.to(roomId).emit('user-joined', { user, users: usersArray, roomId });
    });

    // Leave a specific room
    socket.on('leave-room', ({ roomId }) => {
        leaveRoom(socket, roomId);
    });

    function leaveRoom(sock, roomId) {
        if (!rooms.has(roomId)) return;
        const room = rooms.get(roomId);
        room.users.delete(sock.id);
        room.cursors.delete(sock.id);
        sock.leave(roomId);
        sock.roomIds.delete(roomId);

        const usersArray = Array.from(room.users.values());
        io.to(roomId).emit('user-left', { userId: sock.id, users: usersArray, roomId });

        // Clean up empty rooms
        if (room.users.size === 0) {
            if (room.terminals.has(roomId)) {
                try { room.terminals.get(roomId).kill(); } catch (e) { }
            }
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted (empty)`);
        }
    }

    // Code changes
    socket.on('code-change', ({ roomId, fileName, content }) => {
        const room = rooms.get(roomId);
        if (room && room.files[fileName]) {
            room.files[fileName].content = content;
            socket.to(roomId).emit('code-update', {
                fileName,
                content,
                userId: socket.id
            });
        }
    });

    // Cursor position updates
    socket.on('cursor-update', ({ roomId, cursor }) => {
        const room = rooms.get(roomId);
        if (room) {
            const userData = socket.userData?.[roomId];
            room.cursors.set(socket.id, {
                ...cursor,
                username: userData?.username,
                color: userData?.color
            });
            socket.to(roomId).emit('cursor-moved', {
                userId: socket.id,
                cursor: {
                    ...cursor,
                    username: userData?.username,
                    color: userData?.color
                }
            });
        }
    });

    // Selection updates
    socket.on('selection-update', ({ roomId, selection }) => {
        const userData = socket.userData?.[roomId];
        socket.to(roomId).emit('selection-changed', {
            userId: socket.id,
            selection,
            color: userData?.color,
            username: userData?.username
        });
    });

    // File management — create file at a path
    socket.on('create-file', ({ roomId, filePath, language }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.files[filePath] = { content: '', language: language || 'plaintext', type: 'file' };
            io.to(roomId).emit('file-created', { filePath, language });
        }
    });

    // Create folder
    socket.on('create-folder', ({ roomId, folderPath }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.files[folderPath] = { type: 'folder' };
            io.to(roomId).emit('folder-created', { folderPath });
        }
    });

    socket.on('delete-file', ({ roomId, filePath }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        // If it's a folder, delete all children too
        const isFolder = room.files[filePath]?.type === 'folder';
        const prefix = filePath + '/';

        if (isFolder) {
            Object.keys(room.files).forEach(key => {
                if (key === filePath || key.startsWith(prefix)) {
                    delete room.files[key];
                }
            });
        } else {
            delete room.files[filePath];
        }

        const remaining = Object.keys(room.files).filter(k => room.files[k].type === 'file');
        room.activeFile = remaining.length > 0 ? remaining[0] : null;
        io.to(roomId).emit('file-deleted', { filePath, activeFile: room.activeFile });
    });

    socket.on('switch-file', ({ roomId, fileName }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.activeFile = fileName;
            socket.to(roomId).emit('file-switched', { fileName, userId: socket.id });
        }
    });

    socket.on('change-language', ({ roomId, fileName, language }) => {
        const room = rooms.get(roomId);
        if (room && room.files[fileName]) {
            room.files[fileName].language = language;
            io.to(roomId).emit('language-changed', { fileName, language });
        }
    });

    // Terminal
    socket.on('terminal-input', ({ roomId, data }) => {
        const room = rooms.get(roomId);
        if (room && room.terminals.has(roomId)) {
            try {
                room.terminals.get(roomId).write(data);
            } catch (e) {
                console.error('Terminal write error:', e);
            }
        }
    });

    socket.on('request-terminal', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        if (room.terminals.has(roomId)) {
            socket.emit('terminal-ready');
            return;
        }

        try {
            import('node-pty').then((ptyModule) => {
                const pty = ptyModule.default || ptyModule;
                const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
                const ptyProcess = pty.spawn(shell, [], {
                    name: 'xterm-256color',
                    cols: 80,
                    rows: 24,
                    cwd: process.cwd(),
                    env: process.env
                });

                room.terminals.set(roomId, ptyProcess);

                ptyProcess.onData((data) => {
                    io.to(roomId).emit('terminal-output', { data });
                });

                ptyProcess.onExit(() => {
                    room.terminals.delete(roomId);
                    io.to(roomId).emit('terminal-exit');
                });

                io.to(roomId).emit('terminal-ready');
            }).catch((err) => {
                console.error('node-pty not available:', err.message);
                socket.emit('terminal-error', { message: 'Terminal not available. node-pty required.' });
            });
        } catch (err) {
            socket.emit('terminal-error', { message: 'Failed to create terminal.' });
        }
    });

    socket.on('terminal-resize', ({ roomId, cols, rows }) => {
        const room = rooms.get(roomId);
        if (room && room.terminals.has(roomId)) {
            try { room.terminals.get(roomId).resize(cols, rows); } catch (e) { }
        }
    });

    // ─── Run Code ──────────────────────────────────────────────────────────────
    socket.on('run-code', ({ roomId, fileName, content, language }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        // Kill any existing run process for this room
        if (room.runProcess) {
            try { room.runProcess.kill(); } catch (e) { }
            room.runProcess = null;
        }

        const tmpDir = os.tmpdir();
        const ext = {
            javascript: '.js', typescript: '.ts', python: '.py',
            java: '.java', c: '.c', cpp: '.cpp', csharp: '.cs',
            go: '.go', rust: '.rs', ruby: '.rb', php: '.php',
            swift: '.swift', kotlin: '.kt', shell: '.sh'
        }[language] || '.txt';

        const baseName = fileName ? path.basename(fileName) : `run${ext}`;
        const tmpFile = path.join(tmpDir, `collabdev_${roomId}_${baseName}`);

        try {
            fs.writeFileSync(tmpFile, content, 'utf-8');
        } catch (err) {
            io.to(roomId).emit('run-error', { data: `Failed to write temp file: ${err.message}\r\n` });
            io.to(roomId).emit('run-exit', { code: 1 });
            return;
        }

        // Determine run command based on language
        let cmd, args;
        const isWin = os.platform() === 'win32';
        const outFile = path.join(tmpDir, `collabdev_${roomId}_out${isWin ? '.exe' : ''}`);

        switch (language) {
            case 'javascript':
                cmd = 'node'; args = [tmpFile]; break;
            case 'typescript':
                cmd = 'npx'; args = ['ts-node', tmpFile]; break;
            case 'python':
                cmd = isWin ? 'python' : 'python3'; args = [tmpFile]; break;
            case 'c':
                cmd = 'gcc'; args = [tmpFile, '-o', outFile];
                // Compile first, then run
                try {
                    execSync(`gcc "${tmpFile}" -o "${outFile}"`, { timeout: 15000 });
                    cmd = outFile; args = [];
                } catch (compileErr) {
                    io.to(roomId).emit('run-error', { data: compileErr.stderr?.toString() || compileErr.message + '\r\n' });
                    io.to(roomId).emit('run-exit', { code: 1 });
                    return;
                }
                break;
            case 'cpp':
                cmd = 'g++'; args = [tmpFile, '-o', outFile];
                try {
                    execSync(`g++ "${tmpFile}" -o "${outFile}"`, { timeout: 15000 });
                    cmd = outFile; args = [];
                } catch (compileErr) {
                    io.to(roomId).emit('run-error', { data: compileErr.stderr?.toString() || compileErr.message + '\r\n' });
                    io.to(roomId).emit('run-exit', { code: 1 });
                    return;
                }
                break;
            case 'java':
                try {
                    execSync(`javac "${tmpFile}"`, { cwd: tmpDir, timeout: 15000 });
                    const className = path.basename(tmpFile, '.java');
                    cmd = 'java'; args = ['-cp', tmpDir, className];
                } catch (compileErr) {
                    io.to(roomId).emit('run-error', { data: compileErr.stderr?.toString() || compileErr.message + '\r\n' });
                    io.to(roomId).emit('run-exit', { code: 1 });
                    return;
                }
                break;
            case 'go':
                cmd = 'go'; args = ['run', tmpFile]; break;
            case 'rust':
                try {
                    execSync(`rustc "${tmpFile}" -o "${outFile}"`, { timeout: 30000 });
                    cmd = outFile; args = [];
                } catch (compileErr) {
                    io.to(roomId).emit('run-error', { data: compileErr.stderr?.toString() || compileErr.message + '\r\n' });
                    io.to(roomId).emit('run-exit', { code: 1 });
                    return;
                }
                break;
            case 'ruby':
                cmd = 'ruby'; args = [tmpFile]; break;
            case 'php':
                cmd = 'php'; args = [tmpFile]; break;
            case 'shell':
                cmd = isWin ? 'powershell' : 'bash'; args = [tmpFile]; break;
            default:
                io.to(roomId).emit('run-error', { data: `Unsupported language: ${language}\r\n` });
                io.to(roomId).emit('run-exit', { code: 1 });
                return;
        }

        io.to(roomId).emit('run-start', { language, fileName });

        try {
            const proc = spawn(cmd, args, {
                cwd: tmpDir,
                timeout: 30000,
                env: { ...process.env, PYTHONUNBUFFERED: '1' }
            });

            room.runProcess = proc;

            proc.stdout.on('data', (data) => {
                io.to(roomId).emit('run-output', { data: data.toString() });
            });

            proc.stderr.on('data', (data) => {
                io.to(roomId).emit('run-error', { data: data.toString() });
            });

            proc.on('close', (code) => {
                room.runProcess = null;
                io.to(roomId).emit('run-exit', { code: code || 0 });
                // Cleanup temp files
                try { fs.unlinkSync(tmpFile); } catch (e) { }
                try { fs.unlinkSync(outFile); } catch (e) { }
            });

            proc.on('error', (err) => {
                room.runProcess = null;
                io.to(roomId).emit('run-error', { data: `Failed to execute: ${err.message}\r\n` });
                io.to(roomId).emit('run-exit', { code: 1 });
            });
        } catch (err) {
            io.to(roomId).emit('run-error', { data: `Execution error: ${err.message}\r\n` });
            io.to(roomId).emit('run-exit', { code: 1 });
        }
    });

    // Stop running code
    socket.on('stop-code', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.runProcess) {
            try { room.runProcess.kill(); } catch (e) { }
            room.runProcess = null;
            io.to(roomId).emit('run-exit', { code: -1, stopped: true });
        }
    });

    // Chat messages
    socket.on('chat-send', ({ roomId, text, username, color, timestamp }) => {
        const msg = { text, username, color, timestamp, userId: socket.id };
        io.to(roomId).emit('chat-message', msg);
    });

    // Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
        const userData = socket.userData?.[roomId];
        socket.to(roomId).emit('user-typing', {
            userId: socket.id,
            username: userData?.username,
            isTyping
        });
    });

    // Disconnect — leave all rooms
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId of socket.roomIds) {
            leaveRoom(socket, roomId);
        }
    });
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: rooms.size,
        uptime: process.uptime()
    });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n🚀 CollabDev Server running on http://localhost:${PORT}\n`);
});
