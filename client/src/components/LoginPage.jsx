import { useState, useRef, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SECURITY_QUESTIONS = [
    'What is your pet\'s name?',
    'What city were you born in?',
    'What is your favorite color?',
    'What was your first school\'s name?',
    'What is your mother\'s maiden name?',
    'What is your favorite movie?',
];

export default function LoginPage({ onLogin }) {
    // View: 'login' | 'signup' | 'forgot' | 'reset'
    const [view, setView] = useState('login');
    const [username, setUsername] = useState(() => localStorage.getItem('collabdev-username') || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [fetchedQuestion, setFetchedQuestion] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const canvasRef = useRef(null);
    const inputRef = useRef(null);

    // Animated background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();

        const nodes = [];
        for (let i = 0; i < 80; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 0.8,
                color: ['0,168,132', '37,211,102', '83,189,235', '0,128,105', '177,78,255'][Math.floor(Math.random() * 5)],
                alpha: Math.random() * 0.4 + 0.1
            });
        }

        let animId;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(0,168,132,${0.06 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }
            nodes.forEach(n => {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${n.color},${n.alpha})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(draw);
        };
        draw();

        window.addEventListener('resize', resize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [view]);

    const resetForm = () => {
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setSecurityAnswer('');
        setNewPassword('');
        setError('');
        setSuccess('');
        setFetchedQuestion('');
        setIsLoading(false);
        setShowPassword(false);
    };

    const switchView = (newView) => {
        resetForm();
        setView(newView);
    };

    // ─── Login ────────────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim()) return setError('Please enter your username');
        if (!password) return setError('Please enter your password');

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (rememberMe) {
                localStorage.setItem('collabdev-username', data.username);
                localStorage.setItem('collabdev-session', JSON.stringify({
                    username: data.username, loggedIn: true, timestamp: Date.now()
                }));
            }
            onLogin({ username: data.username });
        } catch (err) {
            setError(err.message || 'Login failed');
            setIsLoading(false);
        }
    };

    // ─── Sign Up ──────────────────────────────────────────────────────────────
    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim()) return setError('Please enter a username');
        if (username.trim().length < 2) return setError('Username must be at least 2 characters');
        if (!password) return setError('Please enter a password');
        if (password.length < 4) return setError('Password must be at least 4 characters');
        if (password !== confirmPassword) return setError('Passwords do not match');
        if (!securityAnswer.trim()) return setError('Please answer the security question');

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    password,
                    email: email.trim(),
                    securityQuestion,
                    securityAnswer: securityAnswer.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess('Account created successfully! You can now sign in.');
            setTimeout(() => switchView('login'), 1500);
        } catch (err) {
            setError(err.message || 'Sign up failed');
            setIsLoading(false);
        }
    };

    // ─── Forgot Password ─────────────────────────────────────────────────────
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim()) return setError('Please enter your username');

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setFetchedQuestion(data.securityQuestion);
            setView('reset');
            setError('');
            setIsLoading(false);
        } catch (err) {
            setError(err.message || 'Could not find account');
            setIsLoading(false);
        }
    };

    // ─── Reset Password ──────────────────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (!securityAnswer.trim()) return setError('Please answer the security question');
        if (!newPassword) return setError('Please enter a new password');
        if (newPassword.length < 4) return setError('Password must be at least 4 characters');

        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    securityAnswer: securityAnswer.trim(),
                    newPassword
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccess(data.message || 'Password reset! You can now sign in.');
            setTimeout(() => switchView('login'), 1500);
        } catch (err) {
            setError(err.message || 'Reset failed');
            setIsLoading(false);
        }
    };

    // ─── Guest Login ─────────────────────────────────────────────────────────
    const handleGuestLogin = () => {
        setIsLoading(true);
        const guestName = `Guest-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        setTimeout(() => {
            onLogin({ username: guestName, isGuest: true });
        }, 400);
    };

    // ─── Password field helper (render function, NOT a component) ─────────────
    const renderPasswordField = (id, label, value, onChange, placeholder, autoComplete) => (
        <div className="login-field">
            <label htmlFor={id}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {label}
            </label>
            <div className="login-password-wrapper">
                <input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete || 'off'}
                />
                <button
                    type="button"
                    className="login-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                >
                    {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );

    // ─── Render helpers ──────────────────────────────────────────────────────
    const renderHeader = (title, subtitle) => (
        <div className="login-logo">
            <div className="login-logo-icon">
                <svg viewBox="0 0 40 40" fill="none">
                    <rect x="4" y="4" width="14" height="14" rx="3" fill="#00A884" opacity="0.9" />
                    <rect x="22" y="4" width="14" height="14" rx="3" fill="#25D366" opacity="0.7" />
                    <rect x="4" y="22" width="14" height="14" rx="3" fill="#53BDEB" opacity="0.5" />
                    <rect x="22" y="22" width="14" height="14" rx="3" fill="#00A884" opacity="0.9" />
                    <circle cx="20" cy="20" r="5" fill="#fff" opacity="0.9" />
                </svg>
            </div>
            <h1 className="login-title">{title}</h1>
            <p className="login-subtitle">{subtitle}</p>
        </div>
    );

    const renderError = () => error && (
        <div className="login-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
        </div>
    );

    const renderSuccess = () => success && (
        <div className="login-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {success}
        </div>
    );

    // ─── Username field (render function, NOT a component) ────────────────────
    const renderUsernameField = () => (
        <div className="login-field">
            <label htmlFor="login-username">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
                Username
            </label>
            <input
                ref={inputRef}
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                autoComplete="username"
            />
        </div>
    );

    // ─── LOGIN VIEW ──────────────────────────────────────────────────────────
    const renderLogin = () => (
        <form className="login-form" onSubmit={handleLogin}>
            {renderError()}
            {renderSuccess()}
            {renderUsernameField()}
            {renderPasswordField('login-password', 'Password', password, setPassword, 'Enter your password', 'current-password')}

            <div className="login-options">
                <label className="login-remember">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span className="login-checkbox-custom" />
                    Remember me
                </label>
                <button type="button" className="login-link" onClick={() => switchView('forgot')}>Forgot Password?</button>
            </div>

            <button className="login-btn login-btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? <span className="login-spinner" /> : (
                    <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                        Sign In
                    </>
                )}
            </button>

            <div className="login-divider"><span>or</span></div>

            <button className="login-btn login-btn-guest" type="button" onClick={handleGuestLogin} disabled={isLoading}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Continue as Guest
            </button>

            <div className="login-switch">
                Don't have an account? <button type="button" className="login-link" onClick={() => switchView('signup')}>Sign Up</button>
            </div>
        </form>
    );

    // ─── SIGNUP VIEW ─────────────────────────────────────────────────────────
    const renderSignup = () => (
        <form className="login-form" onSubmit={handleSignup}>
            {renderError()}
            {renderSuccess()}
            {renderUsernameField()}

            <div className="login-field">
                <label htmlFor="signup-email">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Email <span className="login-optional">(optional)</span>
                </label>
                <input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                />
            </div>

            {renderPasswordField('signup-password', 'Password', password, setPassword, 'Create a password (4+ chars)', 'new-password')}
            {renderPasswordField('signup-confirm', 'Confirm Password', confirmPassword, setConfirmPassword, 'Confirm your password', 'new-password')}

            <div className="login-field">
                <label htmlFor="signup-question">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Security Question
                </label>
                <select
                    id="signup-question"
                    className="login-select"
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                >
                    {SECURITY_QUESTIONS.map(q => (
                        <option key={q} value={q}>{q}</option>
                    ))}
                </select>
            </div>

            <div className="login-field">
                <label htmlFor="signup-answer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Security Answer
                </label>
                <input
                    id="signup-answer"
                    type="text"
                    placeholder="Your answer (for password recovery)"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    maxLength={50}
                />
            </div>

            <button className="login-btn login-btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? <span className="login-spinner" /> : (
                    <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        Create Account
                    </>
                )}
            </button>

            <div className="login-switch">
                Already have an account? <button type="button" className="login-link" onClick={() => switchView('login')}>Sign In</button>
            </div>
        </form>
    );

    // ─── FORGOT PASSWORD VIEW ────────────────────────────────────────────────
    const renderForgot = () => (
        <form className="login-form" onSubmit={handleForgotPassword}>
            {renderError()}
            <p className="login-hint">Enter your username to retrieve your security question.</p>
            {renderUsernameField()}

            <button className="login-btn login-btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? <span className="login-spinner" /> : (
                    <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Find My Account
                    </>
                )}
            </button>

            <div className="login-switch">
                <button type="button" className="login-link" onClick={() => switchView('login')}>← Back to Sign In</button>
            </div>
        </form>
    );

    // ─── RESET PASSWORD VIEW ─────────────────────────────────────────────────
    const renderReset = () => (
        <form className="login-form" onSubmit={handleResetPassword}>
            {renderError()}
            {renderSuccess()}

            <div className="login-security-question-box">
                <div className="login-sq-label">Security Question</div>
                <div className="login-sq-text">{fetchedQuestion}</div>
            </div>

            <div className="login-field">
                <label htmlFor="reset-answer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Your Answer
                </label>
                <input
                    ref={inputRef}
                    id="reset-answer"
                    type="text"
                    placeholder="Enter your security answer"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                />
            </div>

            {renderPasswordField('reset-newpw', 'New Password', newPassword, setNewPassword, 'Enter new password (4+ chars)', 'new-password')}

            <button className="login-btn login-btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? <span className="login-spinner" /> : (
                    <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Reset Password
                    </>
                )}
            </button>

            <div className="login-switch">
                <button type="button" className="login-link" onClick={() => switchView('login')}>← Back to Sign In</button>
            </div>
        </form>
    );

    const viewConfig = {
        login: { title: 'CollabDev', subtitle: 'Real-Time Collaborative Code Editor', render: renderLogin },
        signup: { title: 'Create Account', subtitle: 'Join CollabDev and start collaborating', render: renderSignup },
        forgot: { title: 'Forgot Password', subtitle: 'We\'ll help you get back in', render: renderForgot },
        reset: { title: 'Reset Password', subtitle: `Resetting password for ${username}`, render: renderReset },
    };

    const current = viewConfig[view];

    return (
        <div className="login-page">
            <canvas ref={canvasRef} className="login-bg-canvas" />

            <div className="login-container">
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />

                <div className="login-card" key={view}>
                    {renderHeader(current.title, current.subtitle)}
                    {current.render()}

                    {view === 'login' && (
                        <div className="login-footer">
                            <div className="login-features">
                                <span>⚡ Real-Time</span>
                                <span>👥 Collaborative</span>
                                <span>🔒 Secure</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
