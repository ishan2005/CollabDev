import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const Terminal = forwardRef(function Terminal({ socket, roomId, runRequest, onErrorCount }, ref) {
    const termRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [errorCount, setErrorCount] = useState(0);
    const lastRunIdRef = useRef(null);

    // Expose clear method to parent
    useImperativeHandle(ref, () => ({
        clear: () => {
            if (xtermRef.current) {
                xtermRef.current.clear();
                setErrorCount(0);
                if (onErrorCount) onErrorCount(0);
            }
        },
        writeln: (text) => {
            if (xtermRef.current) xtermRef.current.writeln(text);
        }
    }));

    useEffect(() => {
        if (!termRef.current || xtermRef.current) return;

        const term = new XTerminal({
            theme: {
                background: '#111B21',
                foreground: '#E9EDEF',
                cursor: '#00A884',
                cursorAccent: '#111B21',
                selectionBackground: '#00A88433',
                black: '#4E5D66',
                red: '#EA4335',
                green: '#25D366',
                yellow: '#F0B90B',
                blue: '#53BDEB',
                magenta: '#B14EFF',
                cyan: '#00A884',
                white: '#E9EDEF',
                brightBlack: '#667781',
                brightRed: '#FF6B6B',
                brightGreen: '#25D366',
                brightYellow: '#F0B90B',
                brightBlue: '#53BDEB',
                brightMagenta: '#B14EFF',
                brightCyan: '#00A884',
                brightWhite: '#FFFFFF'
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 13,
            lineHeight: 1.4,
            cursorBlink: true,
            cursorStyle: 'bar',
            allowTransparency: true,
            scrollback: 5000
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current);

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Fit after a short delay
        setTimeout(() => {
            try {
                fitAddon.fit();
            } catch (e) { }
        }, 100);

        // Request terminal from server
        socket.emit('request-terminal', { roomId });

        socket.on('terminal-ready', () => {
            setIsReady(true);
            term.writeln('\x1b[1;36m╔══════════════════════════════════════════╗\x1b[0m');
            term.writeln('\x1b[1;36m║    \x1b[1;37m⚡ CollabDev Terminal Connected\x1b[1;36m       ║\x1b[0m');
            term.writeln('\x1b[1;36m╚══════════════════════════════════════════╝\x1b[0m');
            term.writeln('');
        });

        socket.on('terminal-output', ({ data }) => {
            term.write(data);
        });

        socket.on('terminal-error', ({ message }) => {
            setError(message);
            term.writeln(`\x1b[1;31m⚠ ${message}\x1b[0m`);
            term.writeln('\x1b[33mTerminal requires node-pty. Install it on the server:\x1b[0m');
            term.writeln('\x1b[36m  npm install node-pty\x1b[0m');
            term.writeln('');
            term.writeln('\x1b[32m💡 You can still use the ▶ Run button to execute code!\x1b[0m');
        });

        socket.on('terminal-exit', () => {
            term.writeln('\x1b[1;31m\n[Terminal session ended]\x1b[0m');
        });

        // ─── Run code events ─────────────────────────────────────
        socket.on('run-start', ({ language, fileName }) => {
            setIsRunning(true);
            setErrorCount(0);
            if (onErrorCount) onErrorCount(0);
            term.writeln('');
            term.writeln('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
            term.writeln(`\x1b[1;32m▶ Running\x1b[0m \x1b[1;37m${fileName || 'code'}\x1b[0m \x1b[2m(${language})\x1b[0m`);
            term.writeln('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
            term.writeln('');
        });

        socket.on('run-output', ({ data }) => {
            term.write(data.replace(/\n/g, '\r\n'));
        });

        socket.on('run-error', ({ data }) => {
            setErrorCount(prev => {
                const next = prev + 1;
                if (onErrorCount) onErrorCount(next);
                return next;
            });
            // Display errors in red
            const lines = data.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    term.writeln(`\x1b[1;31m✗ ${line}\x1b[0m`);
                }
            });
        });

        socket.on('run-exit', ({ code, stopped }) => {
            setIsRunning(false);
            term.writeln('');
            if (stopped) {
                term.writeln('\x1b[1;33m■ Process stopped by user\x1b[0m');
            } else if (code === 0) {
                term.writeln('\x1b[1;32m✓ Process exited with code 0\x1b[0m');
            } else {
                term.writeln(`\x1b[1;31m✗ Process exited with code ${code}\x1b[0m`);
            }
            term.writeln('\x1b[2m─────────────────────────────────────────\x1b[0m');
            term.writeln('');
        });

        // Send input to server
        term.onData((data) => {
            socket.emit('terminal-input', { roomId, data });
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            try {
                fitAddon.fit();
                socket.emit('terminal-resize', {
                    roomId,
                    cols: term.cols,
                    rows: term.rows
                });
            } catch (e) { }
        });
        resizeObserver.observe(termRef.current);

        return () => {
            resizeObserver.disconnect();
            socket.off('terminal-ready');
            socket.off('terminal-output');
            socket.off('terminal-error');
            socket.off('terminal-exit');
            socket.off('run-start');
            socket.off('run-output');
            socket.off('run-error');
            socket.off('run-exit');
            term.dispose();
            xtermRef.current = null;
        };
    }, [socket, roomId]);

    // Handle run requests from parent
    useEffect(() => {
        if (!runRequest || runRequest.id === lastRunIdRef.current) return;
        lastRunIdRef.current = runRequest.id;

        socket.emit('run-code', {
            roomId,
            fileName: runRequest.fileName,
            content: runRequest.content,
            language: runRequest.language
        });
    }, [runRequest, socket, roomId]);

    return (
        <div className="terminal-container">
            <div ref={termRef} className="terminal-xterm" />
            {!isReady && !error && (
                <div className="terminal-connecting">
                    <div className="loading-spinner small" />
                    <span>Connecting to terminal...</span>
                </div>
            )}
            {isRunning && (
                <div className="terminal-running-badge">
                    <div className="running-dot" />
                    Running...
                </div>
            )}
        </div>
    );
});

export default Terminal;
