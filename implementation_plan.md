# MirrorKit — The AI Workspace for Website Migration

> Paste a URL. MirrorKit mirrors the site, analyzes it, identifies components, extracts design tokens, screenshots every page, and generates a full report.

---

## MVP Philosophy

**Only ship what works. No "Coming Soon" badges.**

The MVP delivers 7 features at maximum quality:

| # | Feature | Quality Bar |
|---|---------|-------------|
| 1 | Mirror website (wget + Playwright) | Reliable, handles edge cases |
| 2 | Live pipeline progress | Animated timeline, not a spinner |
| 3 | Responsive preview | Desktop / Tablet / Mobile |
| 4 | Full analysis | Framework, CMS, fonts, colors, components, difficulty |
| 5 | File explorer | Tree view with search + file preview |
| 6 | Page screenshots | All pages × 3 viewports |
| 7 | Export | ZIP, HTML, Assets, JSON, Screenshots, Report |

**Not in MVP** (removed entirely, not hidden):
- AI Chat, AI Rebuild, AI Templates
- GitHub/Vercel/Netlify/Docker deploy
- Auth, Teams, Workspaces
- Website monitoring, scheduled backups

These arrive in v2+ when the core is bulletproof.

---

## User Review Required

> [!IMPORTANT]
> **Redis & PostgreSQL**: Required. I'll default to `localhost:6379` (Redis) and `localhost:5432` (PostgreSQL). Confirm or provide connection strings.

> [!IMPORTANT]
> **wget**: Primary crawler. Verify with `which wget`. Playwright is auto-fallback.

> [!IMPORTANT]
> **Playwright**: Used for JS-heavy sites and screenshots. Installed via `npx playwright install chromium`.

---

## Open Questions

> [!IMPORTANT]
> **AI Analysis**: Should I use heuristic detection (regex-based framework/CMS/font/color parsing — works offline, no API keys) or real AI calls (OpenAI/Gemini — needs keys, costs money)? **I recommend heuristics for MVP.** The detection quality is still impressive — users won't know it's not AI.

> [!IMPORTANT]
> **Demo**: Should "Try Demo" pre-load a cached result (instant) or actually mirror `example.com` (takes ~10s)? I recommend **cached** for instant wow factor.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 Frontend                      │
│                                                              │
│  Landing → Projects List → Job Dashboard                     │
│               │                 │                             │
│               │     Overview · Files · Preview · Analysis    │
│               │     Screenshots · Export · Settings           │
│               │                                              │
│          Cmd+K Search (jobs, files, components)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + SSE
┌──────────────────────────▼──────────────────────────────────┐
│                      Express.js API                          │
│  Jobs · Files · Analysis · Preview · Export · Reports        │
└──────┬───────────────────┬──────────────────────────────────┘
       │                   │
┌──────▼──────┐     ┌──────▼──────┐
│   BullMQ    │     │  Prisma +   │
│   + Redis   │     │  PostgreSQL │
└──────┬──────┘     └─────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                       Worker Process                         │
│                                                              │
│  Step 1: Mirror (wget / Playwright)                          │
│  Step 2: Analyze (framework, CMS, tech stack)                │
│  Step 3: Extract (colors, fonts, spacing, shadows, radii)    │
│  Step 4: Detect Components (Navbar, Hero, Pricing, ...)      │
│  Step 5: Screenshot (every page × 3 viewports)               │
│  Step 6: Generate Report (analysis.json, report.html)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
MirrorKit/
├── apps/
│   ├── web/                       # Next.js 15 frontend
│   └── api/                       # Express.js + BullMQ + Worker
├── packages/
│   ├── types/                     # Shared TypeScript types
│   ├── config/                    # Shared tsconfig, ESLint
│   └── lib/                       # Shared utilities
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .gitignore
```

---

## Proposed Changes

### 1. Root — Monorepo Foundation

#### [NEW] [package.json](file:///home/krish/Desktop/project/MirrorKit/package.json)
Root workspace: `turbo dev`, `turbo build`, `turbo lint`.

#### [NEW] [pnpm-workspace.yaml](file:///home/krish/Desktop/project/MirrorKit/pnpm-workspace.yaml)
`apps/*` and `packages/*`.

#### [NEW] [turbo.json](file:///home/krish/Desktop/project/MirrorKit/turbo.json)
Pipeline: `build` (depends on `^build`), `dev` (persistent), `lint`, `typecheck`.

#### [NEW] [.gitignore](file:///home/krish/Desktop/project/MirrorKit/.gitignore)

#### [NEW] [.env.example](file:///home/krish/Desktop/project/MirrorKit/.env.example)

---

### 2. Design System

#### Tokens

| Token | Value |
|-------|-------|
| `--bg` | `#050505` |
| `--surface` | `#0a0a0a` |
| `--surface-elevated` | `#111111` |
| `--border` | `#181818` |
| `--border-hover` | `#262626` |
| `--text` | `#FFFFFF` |
| `--text-secondary` | `#a1a1a1` |
| `--text-muted` | `#555555` |
| `--accent` | `#FFFFFF` |
| `--success` | `#22c55e` |
| `--warning` | `#eab308` |
| `--error` | `#ef4444` |
| `--info` | `#3b82f6` |
| `--radius` | `16px` |
| `--radius-sm` | `8px` |
| `--radius-lg` | `24px` |

#### Animation Rules (strict — Vercel-level restraint)

| Effect | Where |
|--------|-------|
| Fade (opacity 0→1) | Page transitions, card entrances |
| Scale (1.00→1.02) | Hover on cards/buttons |
| Blur (backdrop) | Overlays, Cmd+K modal |
| Number counting (0→38) | Stats cards |
| Progress morph | Pipeline progress bars |
| Shimmer | Skeleton loaders |

Nothing else. No bounces. No springs. No wobbles.

#### [NEW] `apps/web/app/globals.css`
Tailwind v4 `@theme inline` with all design tokens.

---

### 3. Landing Page (`/`)

#### Hero
```
MirrorKit

The AI Workspace for Website Migration

Mirror any public website.
Paste a URL and MirrorKit will:

✓ Mirror the entire site
✓ Analyze the tech stack
✓ Extract components
✓ Create screenshots
✓ Build a full report

┌───────────────────────────────────────────────────────┐
│  🔗  https://example.com                  [Mirror →]  │
└───────────────────────────────────────────────────────┘

                    Try Demo
```

- Input: white glow border on focus, large 56px height
- "Mirror →" button: solid white, black text, 16px radius
- "Try Demo": ghost link below, loads pre-cached result
- Checklist items: staggered fade-in on load

#### Animated Workflow Section
Below hero, auto-playing pipeline animation:

```
   ① Mirror          ② Analyze         ③ Extract
   ━━━━━━━━━━━       ━━━━━━━━━━━       ━━━━━━━━━━━
   Download the      Detect stack,     Find Navbar,
   entire site       CMS, framework    Hero, Footer...

   ④ Screenshot      ⑤ Report          ⑥ Export
   ━━━━━━━━━━━       ━━━━━━━━━━━       ━━━━━━━━━━━
   Every page at     Full analysis     ZIP, HTML,
   3 viewports       auto-generated    Assets, JSON
```

Steps highlight sequentially with a subtle glow, then loop.

#### Features Grid (6 cards)
Glassmorphism cards with hover scale.

| Icon | Title | Description |
|------|-------|-------------|
| 🔍 | Deep Analysis | Framework, CMS, fonts, colors, components — detected instantly |
| 🧩 | Component Detection | Identifies Navbar, Hero, Pricing, FAQ, Footer, and more |
| 📸 | Visual Snapshots | Screenshots every page at Desktop, Tablet, and Mobile |
| 📊 | Full Reports | Auto-generated analysis.json + report.html |
| ⚡ | Performance Audit | Lighthouse-style scores for Performance, SEO, A11y |
| 📦 | Flexible Export | ZIP, HTML, Assets, JSON, Screenshots, or full Report |

#### Footer
"Built with MirrorKit" · GitHub link · minimal.

#### Files
```
apps/web/components/landing/
├── hero.tsx                    # Hero + URL input + checklist
├── workflow-animation.tsx      # 6-step pipeline animation
├── features-grid.tsx           # 6 feature cards
└── footer.tsx
```

---

### 4. Projects Page (`/projects`)

This is the **home** after a user has jobs. Like Linear's project list.

```
Projects                                    [+ New Mirror]

┌─────────────────────────────────────────────────────────┐
│  🌐  apple.com          Completed    Yesterday    →     │
├─────────────────────────────────────────────────────────┤
│  🌐  vercel.com         Completed    2 min ago    →     │
├─────────────────────────────────────────────────────────┤
│  🌐  stripe.com         Running...   Just now     →     │
├─────────────────────────────────────────────────────────┤
│  🌐  linear.app         Completed    3 days ago   →     │
└─────────────────────────────────────────────────────────┘
```

- Each row: favicon + domain, status badge, relative time, click to open
- Status badges: `Completed` (green), `Running` (blue pulse), `Failed` (red)
- `+ New Mirror` button opens URL input dialog
- Empty state: "No projects yet. Mirror your first website."
- Search bar at top: filter by domain
- Sort: most recent first

#### Files
```
apps/web/
├── app/projects/
│   └── page.tsx                # Projects list page
├── components/projects/
│   ├── project-list.tsx        # Job list with status badges
│   ├── new-mirror-dialog.tsx   # URL input dialog
│   └── empty-state.tsx         # First-time empty state
```

---

### 5. Job Dashboard (`/projects/[jobId]`)

#### Top Tab Navigation
```
Overview    Files    Preview    Analysis    Screenshots    Export
```

Active: white text + bottom white border (2px).
Inactive: `#a1a1a1` text.

No sidebar. Clean, Linear-style horizontal tabs.

---

#### 5a. Overview Tab (Default)

Split layout:

**Left column (60%): Pipeline Progress**

When job is running — animated pipeline with progress bars:

```
Mirroring...
█████████████████████████████░░░░░  78%
                    ↓
Analyzing
██████████████░░░░░░░░░░░░░░░░░░░  42%
                    ↓
Extracting Components
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Waiting
                    ↓
Generating Screenshots
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Waiting
                    ↓
Building Report
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Waiting
```

Active step has a pulsing glow. Completed steps collapse with ✓.
Progress bars animate smoothly (morph effect).

When job is complete — switches to **timeline view**:

```
  ✓  10:15:03   Mirroring started
  │
  ✓  10:15:08   38 HTML pages downloaded
  │
  ✓  10:15:24   12 stylesheets processed
  │
  ✓  10:15:41   492 images downloaded
  │
  ✓  10:16:02   8 fonts extracted
  │
  ✓  10:16:15   Tech stack identified: WordPress + React
  │
  ✓  10:16:28   7 components detected
  │
  ✓  10:16:45   Screenshots captured (38 pages × 3 viewports)
  │
  ✓  10:16:52   Report generated
  │
  ●  10:16:52   Complete — Ready for export
```

**Right column (40%): Quick Stats**

Cards with animated number counting (0 → value):

```
┌──────────┐ ┌──────────┐
│ WordPress│ │ 38       │
│ CMS      │ │ Pages    │
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│ 492      │ │ 8        │
│ Images   │ │ Fonts    │
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│ 14       │ │ React    │
│ Colors   │ │ JS Lib   │
└──────────┘ └──────────┘
```

Below stats — **Migration Estimate** card:

```
┌────────────────────────────────┐
│  Migration Estimate            │
│                                │
│  Difficulty:     ██░░░ Medium  │
│  Est. Rebuild:   ~4 hours      │
│  Components:     27            │
│  Est. Tokens:    ~41,000       │
│  Pages:          38            │
│  Total Size:     12.4 MB       │
└────────────────────────────────┘
```

---

#### 5b. Files Tab

```
📂 pages/                          38 files
  📄 index.html                    12.4 KB
  📄 about.html                     8.1 KB
  📄 contact.html                   5.2 KB
📂 css/                             5 files
  📄 style.css                     24.6 KB
📂 images/                        492 files
  🖼 hero.jpg                    245.0 KB
  🖼 logo.png                     12.3 KB
📂 fonts/                           8 files
📂 js/                             12 files
📄 sitemap.xml                      1.2 KB
📄 robots.txt                       0.3 KB
```

- Collapsible folders (animated height)
- Search bar: filter by filename/extension
- Click file → syntax-highlighted modal preview
- Header: total files + total size

---

#### 5c. Preview Tab

```
[💻 Desktop]  [📱 Tablet]  [📱 Mobile]

┌──────────────────────────────────────────┐
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │    Mirrored site in sandboxed    │    │
│  │    iframe                        │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  URL: /index.html            [↗ Open]    │
└──────────────────────────────────────────┘
```

Below the main preview — **Visual Diff**:

```
    Original              Mirror
┌──────────────┐    ┌──────────────┐
│              │    │              │
│  screenshot  │    │  screenshot  │
│  of original │    │  of mirror   │
│              │    │              │
└──────────────┘    └──────────────┘
```

Side-by-side comparison. Original captured at mirror time, mirror served from local.

- Device toggles animate iframe width
- Iframe sandboxed: `sandbox="allow-scripts"`
- URL bar shows current path within mirrored site

---

#### 5d. Analysis Tab

**Section 1: Tech Stack**
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ WordPress  │ │ React      │ │ Tailwind   │ │ jQuery 3   │
│ CMS        │ │ Framework  │ │ CSS        │ │ Library    │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

**Section 2: Components Found**
```
┌──────────────────────────────────────────┐
│  Components Detected (7)                  │
│                                          │
│  🧩 Navbar           ✓ Found            │
│  🧩 Hero Section     ✓ Found            │
│  🧩 Pricing Table    ✓ Found            │
│  🧩 Testimonials     ✓ Found            │
│  🧩 FAQ Accordion    ✓ Found            │
│  🧩 Footer           ✓ Found            │
│  🧩 Contact Form     ✓ Found            │
└──────────────────────────────────────────┘
```

**Section 3: Visual Analysis** (Figma Inspect-style)

```
Color Palette           Typography            Spacing System
┌──┐┌──┐┌──┐┌──┐┌──┐   Poppins 700 48px      8px · 16px · 24px
│  ││  ││  ││  ││  │   Inter 400 16px        32px · 48px · 64px
└──┘└──┘└──┘└──┘└──┘   Inter 600 24px
#1a1a2e #16213e         Mono 400 14px         Border Radius
#0f3460 #e94560 #fff                          4px · 8px · 16px · 24px

                                              Shadows
                                              sm · md · lg · xl
```

Click any color → copies hex. Click any font → shows where it's used.

**Section 4: Performance Scores** (Lighthouse-style circular rings)

```
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│   ╭───╮   │ │   ╭───╮   │ │   ╭───╮   │ │   ╭───╮   │
│   │ 91│   │ │   │ 85│   │ │   │ 78│   │ │   │ 95│   │
│   ╰───╯   │ │   ╰───╯   │ │   ╰───╯   │ │   ╰───╯   │
│Performance│ │   A11y    │ │    SEO    │ │   Best    │
│           │ │           │ │           │ │ Practices │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
```

Green (≥90), Orange (50–89), Red (<50). Rings animate fill on mount.

**Section 5: Detected Issues**
```
❌  Hero background image: 3.2 MB (should be <500 KB)
❌  12 images missing alt text
❌  3 render-blocking font requests
❌  14 duplicate CSS rules
❌  8 pages missing meta descriptions
⚠️  CLS issues on mobile viewport
⚠️  jQuery 2.x detected (outdated, security risk)
```

---

#### 5e. Screenshots Tab

Gallery of page screenshots organized by page, with viewport tabs:

```
[💻 Desktop]  [📱 Tablet]  [📱 Mobile]

/index.html
┌─────────────────────────────────┐
│                                 │
│        page screenshot          │
│                                 │
└─────────────────────────────────┘

/about.html
┌─────────────────────────────────┐
│                                 │
│        page screenshot          │
│                                 │
└─────────────────────────────────┘

/contact.html
...
```

Toggle viewport to switch all screenshots. Click to enlarge.

---

#### 5f. Export Tab

All options **work** in MVP:

```
Export Your Project

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  📦          │  │  📄          │  │  🖼          │
│  Download    │  │  Export      │  │  Export      │
│  ZIP         │  │  HTML Only  │  │  Assets Only │
│              │  │              │  │              │
│  [Download]  │  │  [Download]  │  │  [Download]  │
└─────────────┘  └─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  📊          │  │  📸          │  │  📋          │
│  Export      │  │  Export      │  │  Export      │
│  JSON        │  │  Screenshots │  │  Report      │
│  analysis    │  │              │  │  (HTML)      │
│  [Download]  │  │  [Download]  │  │  [Download]  │
└─────────────┘  └─────────────┘  └─────────────┘
```

All 6 export formats are functional:
- **ZIP**: Full mirrored site
- **HTML Only**: Just the HTML files
- **Assets Only**: Images + fonts + CSS + JS
- **JSON**: `analysis.json` with all analysis data
- **Screenshots**: ZIP of all page screenshots
- **Report**: `report.html` — self-contained analysis report

---

### 6. Command Palette (`Cmd+K`)

Linear/Vercel-style search overlay:

```
┌────────────────────────────────────────────┐
│  🔍  Search everything...                  │
│                                            │
│  Recent                                    │
│  🌐  apple.com                             │
│  🌐  vercel.com                            │
│                                            │
│  Actions                                   │
│  ⊕  New Mirror                             │
│  📂  Browse Files                          │
│  ⚙  Settings                              │
│                                            │
│  (type to search jobs, files, components)  │
└────────────────────────────────────────────┘
```

- Backdrop blur overlay
- Search across: jobs (by domain), files (by name), components (by type)
- Keyboard navigation (↑↓ + Enter)
- `Esc` to close

---

### 7. Settings (`/settings`)

```
Settings

┌──────────────┐  ┌──────────────────────────────────┐
│  General     │  │                                   │
│  Downloads   │  │  General Settings                 │
│  Storage     │  │                                   │
│  Playwright  │  │  Default export format:  [ZIP ▾]  │
│  Theme       │  │  Auto-screenshot:        [On ▾]   │
│              │  │  Max concurrent jobs:    [3  ▾]   │
│              │  │                                   │
│              │  │  [Save Changes]                   │
└──────────────┘  └──────────────────────────────────┘
```

Left sidebar navigation (only on settings page):
- **General**: Default export format, auto-screenshot toggle, max jobs
- **Downloads**: Output directory, wget flags, timeout
- **Storage**: Storage path, max storage size, auto-cleanup
- **Playwright**: Browser path, viewport defaults, timeout
- **Theme**: Dark (default) — placeholder for light mode in future

Settings stored in `localStorage` for MVP (no backend persistence needed).

---

### 8. Backend — Full File Structure

```
apps/api/
├── src/
│   ├── index.ts                        # Express entry + middleware
│   ├── routes/
│   │   ├── jobs.ts                     # CRUD + SSE events
│   │   ├── files.ts                    # File tree + serve files
│   │   ├── preview.ts                  # Serve mirrored site for iframe
│   │   ├── analysis.ts                 # Analysis + components + visual
│   │   ├── screenshots.ts             # Serve screenshots
│   │   ├── export.ts                   # 6 export formats
│   │   └── health.ts
│   ├── services/
│   │   ├── crawler.ts                  # wget spawn + Playwright fallback
│   │   ├── analyzer.ts                 # HTML/CSS tech stack analysis
│   │   ├── component-detector.ts       # DOM heuristic component detection
│   │   ├── visual-extractor.ts         # CSS → colors, fonts, spacing, shadows
│   │   ├── performance-analyzer.ts     # Basic perf metrics (size, requests, etc.)
│   │   ├── issue-detector.ts           # Detect common problems
│   │   ├── screenshotter.ts            # Playwright multi-viewport screenshots
│   │   ├── report-generator.ts         # Generate analysis.json + report.html
│   │   ├── difficulty-estimator.ts     # Estimate migration difficulty
│   │   └── zipper.ts                   # archiver: ZIP, HTML-only, assets-only, etc.
│   ├── queue/
│   │   ├── connection.ts              # Redis + BullMQ connection
│   │   ├── mirror-queue.ts            # Queue definition
│   │   └── mirror-worker.ts           # Worker: orchestrates 6-step pipeline
│   ├── lib/
│   │   ├── logger.ts                  # Pino structured logging
│   │   ├── file-tree.ts              # Directory → tree structure
│   │   ├── url-validator.ts          # URL validation + sanitization
│   │   └── domain-extractor.ts       # URL → domain name
│   └── middleware/
│       ├── cors.ts
│       ├── rate-limit.ts             # 1 active job per IP
│       └── error-handler.ts
├── prisma/
│   └── schema.prisma
├── storage/                           # Mirrored sites + screenshots
├── package.json
├── tsconfig.json
└── .env
```

#### Database Schema

```prisma
model Job {
  id              String    @id @default(cuid())
  url             String
  domain          String
  favicon         String?
  status          Status    @default(PENDING)
  progress        Int       @default(0)
  currentStep     String    @default("pending")
  
  // Pipeline events
  timeline        Json      @default("[]")
  
  // Analysis
  analysis        Json?     // {framework, cms, jsLibraries, ...}
  components      Json?     // [{name, type, selector, confidence}]
  visualAnalysis  Json?     // {colors, fonts, spacing, radii, shadows}
  performance     Json?     // {performance, accessibility, seo, bestPractices}
  issues          Json?     // [{severity, message, category}]
  difficulty      Json?     // {level, estimatedHours, estimatedComponents, estimatedTokens}
  
  // Screenshots
  screenshots     Json?     // {"/index.html": {desktop, tablet, mobile}}
  
  // Files
  outputPath      String?
  totalFiles      Int?
  totalSize       BigInt?
  
  // Error
  error           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Status {
  PENDING
  MIRRORING
  ANALYZING
  EXTRACTING
  SCREENSHOTTING
  REPORTING
  COMPLETED
  FAILED
}
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs` | Create mirror job |
| `GET` | `/api/jobs` | List all jobs (projects page) |
| `GET` | `/api/jobs/:id` | Full job data |
| `GET` | `/api/jobs/:id/events` | SSE: real-time pipeline events |
| `DELETE` | `/api/jobs/:id` | Delete a job + files |
| `GET` | `/api/jobs/:id/files` | File tree |
| `GET` | `/api/jobs/:id/files/*` | Serve specific file |
| `GET` | `/api/jobs/:id/preview/*` | Serve for iframe preview |
| `GET` | `/api/jobs/:id/screenshots/:page/:viewport` | Serve screenshot |
| `GET` | `/api/jobs/:id/export/:format` | Export (zip/html/assets/json/screenshots/report) |
| `GET` | `/health` | Health check |

#### Worker Pipeline

```
Step 1: MIRRORING
  → wget --mirror --convert-links --adjust-extension --page-requisites --no-parent
  → Parse stderr for file-level progress
  → Fallback: Playwright for SPA/JS-heavy sites
  → Capture original screenshot (for visual diff)

Step 2: ANALYZING
  → Parse HTML: count pages, forms, links, meta tags
  → Detect framework: React, Vue, Angular, Svelte, jQuery, vanilla
  → Detect CMS: WordPress, Shopify, Webflow, Squarespace, Wix, Ghost
  → Detect JS libraries from script tags + bundle analysis

Step 3: EXTRACTING
  → CSS parsing: extract all colors, font-family declarations, spacing values
  → Extract font files (woff, woff2, ttf, otf)
  → Extract border-radius values, box-shadow values
  → Component detection (heuristic):
    - <nav> → Navbar
    - <header> with h1/h2 → Hero
    - pricing patterns ($$, /mo, tier) → Pricing
    - blockquote/testimonial patterns → Testimonials
    - <footer> → Footer
    - <form> → Contact/Newsletter
    - image grid patterns → Gallery
    - details/summary or accordion → FAQ

Step 4: SCREENSHOTTING
  → Playwright opens each HTML page
  → Captures at: Desktop (1440×900), Tablet (768×1024), Mobile (375×812)
  → Saves as WebP for efficiency

Step 5: DIFFICULTY ESTIMATION
  → Count pages, components, unique CSS rules, JS complexity
  → Estimate: difficulty (Easy/Medium/Hard), hours, component count, token count

Step 6: REPORTING
  → Generate analysis.json (all data)
  → Generate report.html (self-contained, styled HTML report)
  → Mark job COMPLETED
```

---

### 9. Frontend — Full File Structure

```
apps/web/
├── app/
│   ├── layout.tsx                          # Root: Geist font, dark theme, Cmd+K
│   ├── page.tsx                            # Landing page
│   ├── globals.css                         # Tailwind v4 @theme
│   ├── projects/
│   │   └── page.tsx                        # Projects list
│   ├── projects/
│   │   └── [jobId]/
│   │       ├── layout.tsx                  # Dashboard shell: header + tabs
│   │       ├── page.tsx                    # Overview: pipeline + stats
│   │       ├── files/page.tsx              # File explorer
│   │       ├── preview/page.tsx            # Preview + visual diff
│   │       ├── analysis/page.tsx           # Analysis: stack, components, visual, perf
│   │       ├── screenshots/page.tsx        # Screenshots gallery
│   │       └── export/page.tsx             # 6 export options
│   └── settings/
│       └── page.tsx                        # Settings page
├── components/
│   ├── landing/
│   │   ├── hero.tsx
│   │   ├── workflow-animation.tsx
│   │   ├── features-grid.tsx
│   │   └── footer.tsx
│   ├── projects/
│   │   ├── project-list.tsx
│   │   ├── project-card.tsx
│   │   ├── new-mirror-dialog.tsx
│   │   └── empty-state.tsx
│   ├── dashboard/
│   │   ├── dashboard-header.tsx
│   │   ├── dashboard-tabs.tsx
│   │   ├── pipeline-progress.tsx           # Running: animated pipeline bars
│   │   ├── timeline.tsx                    # Complete: vertical timeline
│   │   ├── quick-stats.tsx                 # Animated counting cards
│   │   ├── migration-estimate.tsx          # Difficulty + estimates
│   │   ├── file-tree.tsx
│   │   ├── file-preview-modal.tsx          # Syntax-highlighted file viewer
│   │   ├── preview-frame.tsx               # Responsive iframe
│   │   ├── visual-diff.tsx                 # Original vs Mirror side-by-side
│   │   ├── tech-stack-cards.tsx            # Framework/CMS/library badges
│   │   ├── component-list.tsx              # Detected components
│   │   ├── visual-analysis.tsx             # Colors, fonts, spacing
│   │   ├── performance-rings.tsx           # Circular Lighthouse scores
│   │   ├── detected-issues.tsx             # Issue list with severity
│   │   ├── screenshots-gallery.tsx         # Page screenshots by viewport
│   │   └── export-cards.tsx                # 6 export option cards
│   ├── command-palette.tsx                 # Cmd+K search modal
│   ├── settings/
│   │   └── settings-form.tsx               # Settings with sidebar nav
│   └── ui/                                 # shadcn/ui base components
├── lib/
│   ├── api.ts                              # Typed API client
│   ├── utils.ts                            # cn() helper
│   ├── constants.ts                        # API URLs, defaults
│   ├── hooks/
│   │   ├── use-job-events.ts               # SSE: real-time pipeline events
│   │   ├── use-job.ts                      # TanStack Query: job data
│   │   ├── use-jobs.ts                     # TanStack Query: all jobs
│   │   ├── use-analysis.ts                 # TanStack Query: analysis
│   │   ├── use-file-tree.ts                # TanStack Query: files
│   │   └── use-count-up.ts                 # Animated number counter
│   └── stores/
│       ├── job-store.ts                    # Zustand: active job
│       └── settings-store.ts               # Zustand: persisted settings
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

### 10. Shared Packages

#### [NEW] `packages/types/`
```typescript
interface Job { id, url, domain, favicon, status, progress, ... }
interface TimelineEvent { step, message, timestamp, status }
interface AnalysisResult { framework, cms, jsLibraries, pages, images, fonts, colors }
interface DetectedComponent { name, type, selector, confidence }
interface VisualAnalysis { colors[], fonts[], spacing[], radii[], shadows[] }
interface PerformanceReport { performance, accessibility, seo, bestPractices }
interface DetectedIssue { severity: 'error'|'warning', message, category }
interface DifficultyEstimate { level, estimatedHours, estimatedComponents, estimatedTokens }
interface FileNode { name, path, type, size?, children?, mimeType? }
type ExportFormat = 'zip' | 'html' | 'assets' | 'json' | 'screenshots' | 'report'
```

#### [NEW] `packages/config/`
`tsconfig.base.json`, `tsconfig.nextjs.json`, `tsconfig.node.json`.

#### [NEW] `packages/lib/`
URL validation, byte/time formatters, domain extractor.

---

## Implementation Order

| Phase | What | Deliverable |
|-------|------|-------------|
| **1** | Monorepo scaffold | Turborepo + pnpm + configs |
| **2** | Design system + shadcn/ui | Theme, globals.css, base components |
| **3** | Landing page | Hero + workflow animation + features |
| **4** | Backend core | Express + Prisma + BullMQ + Redis |
| **5** | Crawler service | wget + Playwright fallback |
| **6** | Worker pipeline | 6-step pipeline with SSE events |
| **7** | Projects page | Job list with status + new mirror dialog |
| **8** | Dashboard overview | Pipeline progress + timeline + stats |
| **9** | Analyzer + visual extractor | Framework/CMS/color/font/component detection |
| **10** | Analysis page | Full analysis UI with all sections |
| **11** | File explorer | Tree view + search + file preview modal |
| **12** | Preview + visual diff | Responsive iframe + original vs mirror |
| **13** | Screenshots | Playwright multi-viewport + gallery UI |
| **14** | Export | 6 formats: ZIP, HTML, Assets, JSON, Screenshots, Report |
| **15** | Report generator | analysis.json + report.html auto-generation |
| **16** | Cmd+K | Command palette search |
| **17** | Settings | Settings page with localStorage persistence |
| **18** | Polish | Animations, responsive, error states, empty states |

---

## Verification Plan

### Automated
```bash
pnpm turbo typecheck    # Type check everything
pnpm turbo build        # Build all apps
pnpm turbo dev          # Start full dev environment
```

### Manual Testing Flow
1. **Landing** → Premium hero, animated workflow, responsive layout
2. **Paste URL** → Click "Mirror →" → Redirected to dashboard
3. **Pipeline** → Animated progress bars advance in real-time
4. **Timeline** → After completion, timeline view replaces pipeline
5. **Stats** → Numbers count up from 0 → values
6. **Migration estimate** → Difficulty, hours, components, tokens displayed
7. **Files** → Browse tree, search, click to preview file content
8. **Preview** → Mirrored site in iframe, toggle Desktop/Tablet/Mobile
9. **Visual diff** → Original vs Mirror side-by-side comparison
10. **Analysis** → Tech stack badges, components list, colors, fonts, spacing
11. **Performance** → Circular rings with animated fill, color-coded
12. **Issues** → Problem list with severity icons
13. **Screenshots** → Gallery by page and viewport, click to enlarge
14. **Export** → All 6 formats download correctly
15. **Projects** → Return to projects list, see job with status
16. **Cmd+K** → Search across jobs, files, components
17. **Settings** → Change defaults, persists on reload
18. **Error** → Invalid URL shows friendly error, job marked failed
19. **Mobile** → All pages responsive on phone-sized screens

### Test Sites
- `https://example.com` — Baseline (simple, fast)
- A WordPress blog — CMS detection, many pages/images
- A React SPA — Playwright fallback test
