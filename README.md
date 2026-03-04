# ⚡ CollabDev — Real-Time Collaborative Code Editor

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Monaco_Editor-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

<p align="center">
  A modern, real-time collaborative code editor where multiple developers can write code together — like Google Docs, but for code.
</p>

---

## ✨ Features

- 🔄 **Real-Time Sync** — Code changes sync instantly across all connected users via WebSockets
- 👥 **Live Cursors** — See where other collaborators are typing in real-time with colored cursors
- 💬 **Team Chat** — Built-in chat panel for communication while coding
- 🖥️ **Integrated Terminal** — Full terminal emulator powered by `xterm.js` and `node-pty`
- ▶️ **Run Code** — Execute code directly in 15+ languages (JavaScript, Python, C++, Java, Go, Rust, and more)
- 📁 **File Explorer** — Tree-based file system with create/delete files and folders
- 🔐 **Authentication** — Sign up, login, password recovery with security questions
- 🎨 **Dark & Light Themes** — Beautiful WhatsApp-inspired UI with theme toggle
- ⌨️ **Command Palette** — VS Code-style `Ctrl+K` command palette
- 📋 **Room Management** — Create rooms, join via room code, multi-room tabs, room history

## 🖼️ Screenshots

| Landing Page | Editor View |
|:---:|:---:|
| Dark-themed landing with room creation | Full editor with sidebar, terminal & chat |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, Monaco Editor |
| **Backend** | Node.js, Express, Socket.IO |
| **Terminal** | xterm.js, node-pty |
| **Auth** | bcryptjs (hashed passwords & security answers) |
| **Styling** | Custom CSS (WhatsApp-inspired dark/light theme) |

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ 
- **npm** v9+

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/CollabDev.git
cd CollabDev

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running Locally

```bash
# Terminal 1 — Start the server
cd server
npm start          # or: npm run dev (with auto-reload)

# Terminal 2 — Start the client
cd client
npm run dev
```

- **Client** runs at `http://localhost:5173`
- **Server** runs at `http://localhost:3001`

## 📁 Project Structure

```
CollabDev/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.jsx       # Auth (login/signup/forgot password)
│   │   │   ├── LandingPage.jsx     # Room creation & joining
│   │   │   ├── EditorView.jsx      # Main editor layout
│   │   │   ├── CodeEditor.jsx      # Monaco editor wrapper
│   │   │   ├── Sidebar.jsx         # File explorer & user list
│   │   │   ├── Toolbar.jsx         # Top toolbar
│   │   │   ├── ChatPanel.jsx       # Team chat
│   │   │   ├── Terminal.jsx        # xterm.js terminal
│   │   │   ├── CommandPalette.jsx  # Ctrl+K command palette
│   │   │   └── ToastContainer.jsx  # Notifications
│   │   ├── App.jsx                 # Main app with routing & state
│   │   ├── index.css               # Complete design system
│   │   └── main.jsx                # Entry point
│   └── index.html
│
├── server/                 # Node.js backend
│   ├── index.js            # Express + Socket.IO server
│   └── package.json
│
└── README.md
```

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` | Command Palette |
| `Ctrl + `` ` | Toggle Terminal |
| `Ctrl + B` | Toggle Sidebar |
| `Ctrl + Enter` / `F5` | Run Code |
| `Ctrl + Shift + C` | Stop Running Code |

## 🌐 Supported Languages

JavaScript · TypeScript · Python · Java · C · C++ · C# · Go · Rust · Ruby · PHP · Swift · Kotlin · HTML · CSS · SQL · Shell

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by <strong>Ishan Agrawal</strong>
</p>
