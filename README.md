# WebHarvest 🌐

WebHarvest is a beautiful, local-first utility to mirror, inspect, preview, and download static copies of public websites. It operates completely in-memory and on the local filesystem, without requiring external database setups, background workers, or API keys.

---

## Key Features

- 🌌 **Premium Dark Aesthetics**: Designed with curated color palettes, glassmorphic inputs, and subtle micro-animations.
- ⚡ **Real-Time Download Dashboard**: Spawns a local `wget` crawler subprocess and uses Server-Sent Events (SSE) to update active download progress.
- 🔍 **Tech Stack Inspection**: Analyzes `index.html` structure to detect popular frameworks and CMS packages (WordPress, Next.js, etc.) and computes aggregate statistics (page/image counts, directories size).
- 📁 **File Tree Explorer**: Visualizes crawled assets in an interactive directory tree.
- 🖥️ **Sandboxed Preview**: Safe dynamic serving of mirrored resources inside an iframe, featuring responsive viewport toggles (Desktop, Tablet, Mobile).
- 📦 **Instant ZIP Downloads**: Packages the entire mirrored directory into a clean `.zip` archive on the fly using `jszip`.

---

## System Requirements

- **Node.js**: v20 or higher.
- **wget**: WebHarvest spawns a `wget` subprocess to perform site mirroring. Ensure `wget` is installed and available in your environment's `$PATH`.
  - **Linux / Ubuntu**: `sudo apt install wget`
  - **macOS**: `brew install wget`
  - **Windows**: Install via WinGet, Scoop, or download the binary and append it to your system variables path.

---

## Getting Started

1. Clone or navigate into the project directory:
   ```bash
   cd webharvest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to start mirroring.

---

## Technical Architecture

WebHarvest relies on a zero-database local architecture:
```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js (App Router)                     │
│                                                              │
│  [/] Landing Input ──(Redirect)──> [/mirror/[id]]           │
│                                           │                  │
│  Overview · Files · Preview · Download ◄──┘                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ APIs (Local Fetch & SSE)
┌──────────────────────────▼──────────────────────────────────┐
│                    Next.js Route Handlers                   │
│                                                              │
│  /api/mirror           -> Start wget background process      │
│  /api/mirror/[id]/prog -> SSE stream of file system stats    │
│  /api/mirror/[id]/view -> Analyze downloaded index.html     │
│  /api/mirror/[id]/file -> Read directories & build tree     │
│  /api/mirror/[id]/prev -> Dynamic MIME-type static server   │
│  /api/download/[id]    -> Stream JSZip compressed archive   │
└─────────────────────────────────────────────────────────────┘
```
# WebHarvest
