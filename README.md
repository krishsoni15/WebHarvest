# WebHarvest 🌐

<div align="center">

![WebHarvest Banner](public/fav.png)

### **Intelligent Website Cloner & Interactive Offline Mirror Studio**

*Mirror, inspect, live-stream, and download complete static & Single-Page Applications with zero-dependency standalone offline bundles.*

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📑 Table of Contents

- [Overview & Purpose](#-overview--purpose)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Directory Structure](#-directory-structure)
- [How It Works](#-how-it-works)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Standalone Offline Bundles](#-standalone-offline-bundles)
- [Tech Stack](#-tech-stack)
- [Contributing & License](#-contributing--license)

---

## 💡 Overview & Purpose

Modern websites are rarely just simple static HTML files. Modern web applications built with **React**, **Next.js**, **Vue**, **Angular**, and **Vite** rely heavily on dynamic JavaScript chunking, client-side routing (`history.pushState`), external fonts, media assets, and authenticated user states.

Traditional mirror utilities (like `wget` or `httrack`) often fail on modern websites:
- They break on Single-Page Application (SPA) client-side routes, yielding blank 404 screens.
- They cannot capture dynamic client-rendered assets and background chunks.
- They get stuck behind login forms and authentication barriers.
- They cannot be run offline without configuring complex local web servers or reverse proxies.

**WebHarvest** solves this entirely. It is a full-stack, local-first web intelligence and website cloning studio. It captures websites dynamically, streams real-time capture logs via Server-Sent Events (SSE), serves live sandboxed previews across device chassis (Desktop, Laptop, Tablet, Mobile), provides an interactive code & asset inspector, and packages everything into **zero-dependency standalone runnable archives** (`.zip`) that run anywhere using native Node.js or Python.

---

## ⚡ Key Features

### 1. 🕷️ Intelligent Hybrid Crawling Engine
- **Fast HTTP & Deep DOM Traversal**: Recursively downloads HTML, CSS, JavaScript chunks, SVGs, web fonts (`woff2`), images, and JSON payloads.
- **Dynamic Asset Proxy & Fallback**: Automatically fetches and caches missing dynamic chunks and external assets on the fly during preview.
- **Link Normalization & Rewriting**: Rewrites root-relative URLs, asset paths, and domain references so links work completely offline.

### 2. 🖥️ Sandboxed Live Screen Preview
- **Multi-Device Viewport Chassis**: Switch seamlessly between **Desktop Monitor**, **MacBook Laptop**, **iPad Tablet (768px)**, and **iPhone Pro (390px)** responsive frames.
- **Side-by-Side Code Inspector**: Inspect the raw HTML/CSS source code with line numbers, file sizes, and one-click copy.
- **Non-Flickering Silent Refresh**: Ultra-smooth iframe rendering without jarring white-screen reload flashes or destructive remounts.

### 3. 🔐 Smart Authentication & Demo Login Interceptor
- **Credential Detection**: Automatically detects published demo credentials (e.g. `admin@demo.com / admin`) from login forms.
- **Session Injection**: Pre-hydrates `localStorage` tokens and `next-auth` cookies to automatically unlock internal dashboards.
- **One-Click Bypass**: Direct navigation shortcuts to detected internal admin pages (Analytics, CRM, eCommerce, Apps).

### 4. 🗂️ In-Place Compact Sidebar Navigation
- **10–15% More Screen Space**: Lean, high-efficiency right sidebar giving maximum horizontal space to the preview canvas.
- **Responsive In-Place Tabs**:
  - **Dash**: High-level mirror summary, source address, total data size, color palette, and one-click ZIP download.
  - **Pages**: Categorized list of captured routes (Dashboards, Apps, Auth, All) with live instant switcher.
  - **Assets**: Searchable media library (Images, CSS, JS, Fonts) with thumbnail previews and downloads.
  - **Files**: Complete directory explorer allowing instant inspection of any captured file.

### 5. 📦 Zero-Dependency Standalone Offline Bundles
- Every exported ZIP archive includes:
  - `server.js`: Lightweight, zero-dependency Node.js HTTP server using only standard libraries (`http`, `fs`, `path`).
  - `serve.py`: Zero-dependency Python 3 multithreaded server with SPA routing fallback.
  - `start.sh` & `start.bat`: One-click double-executable launchers for macOS, Linux, and Windows.
  - `README.md`: Auto-generated, rich Markdown documentation tailored specifically to the mirror with exact metrics, pages table, and launch commands.

### 6. 🎨 Tech Stack & Brand Color Detection
- Automatically identifies target technologies (Next.js, React, Vue, Tailwind, Bootstrap, WordPress, etc.).
- Extracts the dominant brand color palette with click-to-copy HEX codes.

---

## 🏗️ System Architecture

```
                                  [ User Browser ]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      [ / ] Landing Capture Input                 [ /mirror/[id] ] Studio
                   │                                           │
                   ▼ (POST /api/mirror)                        ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                 WebHarvest Backend Engine                   │
        │                                                             │
        │  ┌──────────────────┐    Events     ┌────────────────────┐  │
        │  │ Crawler Engine   │──────────────>│ SSE Progress Stream│  │
        │  │ (HTTP / Hybrid)  │               │ /api/.../progress  │  │
        │  └────────┬─────────┘               └────────────────────┘  │
        │           │ Writes                                          │
        │           ▼                                                 │
        │  ┌──────────────────┐               ┌────────────────────┐  │
        │  │ SQLite Database  │<─────────────>│ Next.js App Router │  │
        │  │ (Jobs, Metrics)  │               │ (Middleware Proxy) │  │
        │  └──────────────────┘               └─────────┬──────────┘  │
        │           │ Files                             │             │
        │           ▼                                   ▼             │
        │  ┌──────────────────┐               ┌────────────────────┐  │
        │  │ Local Filesystem │               │ Sandboxed Preview  │  │
        │  │ (tmp/downloads/) │               │ /api/.../preview/  │  │
        │  └────────┬─────────┘               └────────────────────┘  │
        │           │                                                 │
        │           ▼ Bundle & ZIP                                    │
        │  ┌───────────────────────────────────────────────────────┐  │
        │  │  Standalone Exporter (server.js, serve.py, README.md) │  │
        │  └───────────────────────────────────────────────────────┘  │
        └─────────────────────────────────────────────────────────────┘
```

### Architectural Highlights

1. **State Persistence**: Uses **SQLite via better-sqlite3** with Write-Ahead Logging (`WAL` mode) for reliable job management that survives server restarts.
2. **Reverse Asset Middleware**: The custom `middleware.ts` intercepts root-relative asset requests (e.g. `/assets/...`, `/fonts/...`) emitted by mirrored SPAs and dynamically rewrites them to the appropriate sandboxed preview endpoint (`/api/mirror/[id]/preview/...`).
3. **On-Demand Streaming**: Downloads are streamed directly using native WebStreams for ultra-fast, memory-efficient ZIP delivery.

---

## 📁 Directory Structure

```
webharvest/
├── app/
│   ├── api/
│   │   ├── download/[id]/         # Standalone ZIP archive packaging & streaming
│   │   └── mirror/
│   │       ├── route.ts           # Job creation & crawler dispatch
│   │       └── [id]/
│   │           ├── assets/        # Asset discovery & cataloging API
│   │           ├── auth-login/    # Offline authentication trigger
│   │           ├── cancel/        # Graceful crawl cancellation
│   │           ├── files/         # File tree directory builder
│   │           ├── health/        # Performance & asset health scoring
│   │           ├── logs/          # Raw crawl logs streaming
│   │           ├── manifest/      # Machine-readable mirror metadata
│   │           ├── network/       # Network request waterfalls
│   │           ├── overview/      # Job summary & tech stack statistics
│   │           ├── preview/       # Dynamic MIME-aware sandboxed preview server
│   │           ├── progress/      # Server-Sent Events (SSE) live progress stream
│   │           └── retry/         # Restart / retry failed crawl jobs
│   ├── mirror/[id]/               # Primary Mirror Studio dashboard interface
│   ├── globals.css                # Global styles, typography & color variables
│   ├── layout.tsx                 # Root layout with theme providers & metadata
│   └── page.tsx                   # Sleek landing page with target capture input
├── components/
│   ├── crawl/                     # Live crawling status, metrics, & terminal components
│   │   ├── CrawlHeader.tsx        # Top status bar with controls (Pause, Cancel, Export)
│   │   ├── DraggableTerminal.tsx  # Floating expandable live log terminal window
│   │   ├── LiveActivity.tsx       # Real-time request and file discovery streams
│   │   ├── MetricCards.tsx        # 4-metric overview cards (Pages, Assets, Rate, Size)
│   │   ├── ProgressHeader.tsx     # Progress bar, current action, & ETA estimation
│   │   └── ResourceCoverage.tsx   # Progress breakdown across HTML, CSS, JS, Media
│   ├── landing/                   # Hero section, feature grids, and target input bar
│   ├── mirror/                    # Mirror Studio completed view tabs
│   │   ├── AssetsTab.tsx          # Full-screen asset gallery & lightbox
│   │   ├── FilesTab.tsx           # Interactive directory tree explorer
│   │   ├── HealthTab.tsx          # Mirror audit score & broken link checks
│   │   ├── LogsTab.tsx            # Full crawl logs viewer with search & copy
│   │   ├── MirrorHeader.tsx       # Top bar for completed archives with actions
│   │   ├── NetworkTab.tsx         # Network request waterfall inspector
│   │   ├── OverviewTab.tsx        # Executive summary & system metrics
│   │   ├── PagesTab.tsx           # Captured pages table with status codes
│   │   ├── PreviewTab.tsx         # Sandboxed live viewport preview & code viewer
│   │   └── ProjectDashboardCard.tsx # Compact right sidebar dashboard & ZIP launcher
│   └── ui/                        # Reusable primitives (Buttons, Tabs, Dialogs, Inputs)
├── lib/
│   ├── authCrawler.ts             # Intelligent crawler & standalone runnable bundle generator
│   ├── db/                        # SQLite schema, connection client, & CRUD operations
│   ├── crawler/                   # URL normalization & link extraction algorithms
│   ├── export/                    # ZIP archive stream generation
│   ├── jobStore.ts                # In-memory active jobs state cache
│   └── resolveDir.ts              # Cross-platform download directory path resolution
├── data/                          # SQLite persistent database storage (.gitkeep)
├── middleware.ts                  # Root-relative SPA asset rewrite middleware
├── package.json                   # Project dependencies and script definitions
└── README.md                      # Project documentation
```

---

## 🚀 How It Works

### Step 1: Input Target URL
Enter any valid public website URL on the landing screen (e.g. `https://example.com`) and choose your crawl mode (**Auto Hybrid**, **Fast HTTP**, or **Deep DOM**).

### Step 2: Live Crawl & Real-Time Streaming
WebHarvest dispatches the crawler, discovers linked pages, downloads stylesheets, scripts, and media, and rewrites internal links. Watch live progress via:
- Real-time percentage progress bar and action status.
- Real-time request and file discovery feed.
- Floating draggable console terminal with live engine logs.

### Step 3: Sandboxed Live Preview & Code Inspector
Once captured (or even while actively streaming), preview the live application:
- Test responsive layouts on **Desktop**, **MacBook**, **iPad**, or **iPhone** frames.
- Inspect the exact HTML/CSS source code with syntax highlighting.
- Browse captured subpages, assets, and directory files in the compact sidebar without leaving the preview.
- Bypass authentication forms with detected demo credentials.

### Step 4: Standalone ZIP Export
Click **Download ZIP Archive** to get a self-contained archive containing:
- All captured pages and assets.
- Standalone zero-dependency Node.js (`server.js`) and Python (`serve.py`) servers.
- Ready-to-run shell scripts (`start.sh`, `start.bat`).
- A customized `README.md` summarizing the exact scraped metrics and pages index.

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v20.x or higher
- **npm** / **pnpm** / **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone git@github.com:krishsoni15/WebHarvest.git
   cd WebHarvest
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Launch the application**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/mirror` | `POST` | Create and launch a new website mirroring job |
| `/api/mirror/[id]/progress` | `GET` | SSE stream emitting live crawl progress, stats, and logs |
| `/api/mirror/[id]/overview` | `GET` | Retrieve job summary, tech stack, and detected colors |
| `/api/mirror/[id]/preview/[[...path]]` | `GET` | Sandboxed preview server with dynamic MIME handling |
| `/api/mirror/[id]/files` | `GET` | Get hierarchical file tree of all downloaded resources |
| `/api/mirror/[id]/assets` | `GET` | List all discovered images, stylesheets, scripts, and fonts |
| `/api/mirror/[id]/pages` | `GET` | List captured HTML pages with status codes and sizes |
| `/api/mirror/[id]/network` | `GET` | List network request waterfall entries |
| `/api/mirror/[id]/health` | `GET` | Get mirror completeness and health score audit |
| `/api/mirror/[id]/logs` | `GET` | Retrieve raw crawl logs |
| `/api/mirror/[id]/cancel` | `POST` | Abort and cancel an active crawling job |
| `/api/mirror/[id]/retry` | `POST` | Restart a failed crawl job |
| `/api/mirror/[id]/auth-login` | `POST` | Inject credentials and trigger authenticated dashboard crawl |
| `/api/download/[id]` | `GET` | Download complete zero-dependency standalone ZIP archive |

---

## 💻 Standalone Offline Bundles

When you extract a downloaded WebHarvest mirror archive, you can run it immediately without installing any third-party dependencies:

### Using Node.js
```bash
# Uses native Node.js http and fs modules (no npm install required)
node server.js

# Or specify a custom port:
node server.js 3000
```

### Using Python 3
```bash
# Uses Python's built-in http.server with multi-threaded SPA routing
python3 serve.py

# Or specify a custom port:
python3 serve.py 3000
```

### Double-Click Executables
- **macOS / Linux**: Double-click `start.sh` or run `./start.sh`
- **Windows**: Double-click `start.bat`

---

## 🧰 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS
- **Database**: [SQLite via better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Components**: [Radix UI](https://www.radix-ui.com/) primitives
- **Real-Time**: Server-Sent Events (SSE)

---

## 🤝 Contributing

Contributions are welcome! Whether it's reporting a bug, proposing an improvement, or submitting a feature pull request:

1. **Fork the Repository**
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Your Changes**: `git commit -m "feat: add amazing feature"`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

