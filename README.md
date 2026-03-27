# 🛡️ LogSentinal — AI Cyber Forensics Dashboard

> **A premium Next.js SOC (Security Operations Center) frontend for the LogSentinal AI Forensics Microservice v2.0.**
> Upload Windows Event Logs, get AI-powered threat detection, visualize attack chains, and analyze forensic findings — all in one sleek dashboard.

---

## 📋 Table of Contents

| # | Section |
|---|---------|
| 1 | [Tech Stack](#-tech-stack) |
| 2 | [Architecture & Data Flow](#-architecture--data-flow) |
| 3 | [Prerequisites](#-prerequisites) |
| 4 | [Installation](#-installation) |
| 5 | [Environment Setup](#-environment-setup) |
| 6 | [Running the App](#-running-the-app) |
| 7 | [Backend Requirements](#-backend-requirements) |
| 8 | [Project Structure](#-project-structure) |
| 9 | [Pages Reference](#-pages-reference) |
| 10 | [Component Reference](#-component-reference) |
| 11 | [API Client Reference](#-api-client-reference) |
| 12 | [Proxy Bridge](#-proxy-bridge) |
| 13 | [Theme System](#-theme-system) |
| 14 | [Mock Data Strategy](#-mock-data-strategy) |
| 15 | [Static Assets](#-static-assets) |

---

## 🧰 Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | `^16.2.1` | SSR + file-based routing |
| **Language** | TypeScript | `^5.7.3` | Type-safe development |
| **Styling** | Tailwind CSS | `^3.4.17` | Utility-first CSS |
| **Animations** | Framer Motion | `^11.15.0` | Page transitions, graph animations |
| **Charts** | Recharts | `^2.15.0` | Severity bars, donut charts |
| **Graph/Flow** | ReactFlow | `^11.11.4` | Node-based attack chain diagrams |
| **Icons** | Lucide React | `^0.468.0` | Consistent icon library |
| **UI Primitives** | Radix UI | Various | Accessible dialogs, tabs, dropdowns |
| **Markdown** | react-markdown | `^9.0.3` | AI summary rendering |
| **DB Client** | @supabase/supabase-js | `^2.47.10` | Supabase storage integration |
| **Utilities** | clsx + tailwind-merge | Latest | Dynamic class names |

---

## 🏗️ Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │               Next.js Frontend  (:3000)                      │  │
│   │                                                              │  │
│   │  Dashboard ──► Upload CSV ──► Analyze ──► View Results       │  │
│   │      │              │                          │             │  │
│   │   /index        UploadZone               /analysis/[id]      │  │
│   │                  component               ├── index (Overview) │  │
│   │                                          ├── findings         │  │
│   │                                          ├── chains           │  │
│   │                                          └── summary          │  │
│   └─────────────────────┬────────────────────────────────────────┘  │
│                         │  all fetch() calls                        │
│                         ▼                                           │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │         Next.js API Route — CORS Proxy                       │  │
│   │         pages/api/proxy/[...path].ts                         │  │
│   │                                                              │  │
│   │   /api/proxy/{path}  ────────────►  http://127.0.0.1:8000/  │  │
│   └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────┬──────────────────────────┘
                                           │  HTTP (server-to-server)
                                           ▼
                   ┌───────────────────────────────────────┐
                   │   LogSentinal SOC Backend  (:8000)    │
                   │                                       │
                   │  POST /upload          ← CSV upload   │
                   │  GET  /scans           ← list scans   │
                   │  GET  /scans/{id}      ← scan detail  │
                   │  DELETE /scans/{id}    ← delete scan  │
                   │  GET  /scans/{id}/categories          │
                   │  GET  /scans/{id}/events              │
                   │  GET  /scans/{id}/chains              │
                   │  GET  /scans/{id}/travels             │
                   │  GET  /scans/{id}/summary             │
                   └───────────────────┬───────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │   Supabase (cloud)     │
                          │  • PostgreSQL DB        │
                          │  • CSV file storage    │
                          └────────────────────────┘
```

### Request Lifecycle

```
1.  User drops CSV on UploadZone
2.  UploadZone → lib/api.ts → uploadFile()
3.  uploadFile() → fetch("/api/proxy/upload?user_id=...")
4.  Next.js proxy → http://127.0.0.1:8000/upload (multipart)
5.  Backend analyses file, stores results in Supabase
6.  Backend returns { scan_id, total_logs, total_threats, risk_score }
7.  Frontend redirects user to /analysis/{scan_id}
8.  Overview page fetches getScan(), getScanCategories(), getScanEvents(), getScanChains()
9.  All data renders: stat cards, threat level gauge, charts, findings table
```

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| **Node.js** | `v18.0.0` | `node --version` |
| **npm** | `v9.0.0` | `npm --version` |
| **LogSentinal Backend** | Running on `:8000` | `curl http://localhost:8000/health` |

---

## 📦 Installation

### Step 1 — Clone / Navigate to the frontend folder

```bash
cd C:\mcpantigrav\ai-cyber-forensics\frontend
```

### Step 2 — Install all dependencies

```bash
npm install
```

This installs all packages from `package.json`, including:
- Next.js runtime
- Tailwind CSS + PostCSS
- Framer Motion, Recharts, ReactFlow
- Radix UI primitives
- TypeScript compiler
- All type definitions

> ⏱️ First install typically takes 1–2 minutes.

### Step 3 — Verify installation

```bash
npm list --depth=0
```

You should see all top-level packages listed without errors.

---

## 🔧 Environment Setup

Create a `.env.local` file in the `frontend/` directory:

```bash
# frontend/.env.local

# Backend base URL (the Next.js proxy target)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase credentials (needed if using Supabase client directly)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

---

## 🚀 Running the App

### Development Mode (recommended)

```bash
npm run dev
```

- Opens at **http://localhost:3000**
- Hot-reload on file changes
- Full error overlay in browser
- Source maps enabled

### Production Build

```bash
# 1. Build optimised bundle
npm run build

# 2. Start production server
npm start
```

### Lint Check

```bash
npm run lint
```

---

## 🔌 Backend Requirements

The frontend expects the **LogSentinal SOC Microservice v2.0** running at `http://localhost:8000`.

| Endpoint | Method | Used By |
|----------|--------|---------|
| `/health` | GET | App startup check |
| `/upload?user_id={uuid}` | POST | File upload from UploadZone |
| `/scans` | GET | Dashboard — list previous analyses |
| `/scans/{id}` | GET | Overview page — scan details |
| `/scans/{id}` | DELETE | Dashboard — delete scan |
| `/scans/{id}/categories` | GET | Overview charts, Findings page stats |
| `/scans/{id}/events` | GET | Findings page list |
| `/scans/{id}/chains` | GET | Attack Chains page |
| `/scans/{id}/travels` | GET | Attack Chains — Travel Alerts |
| `/scans/{id}/summary` | GET | AI Summary page |

All requests go through the **CORS proxy** at `pages/api/proxy/[...path].ts`, so no direct browser-to-backend calls are made.

---

## 📁 Project Structure

```
frontend/
│
├── 📄 package.json              # All dependencies & npm scripts
├── 📄 next.config.js            # Next.js configuration (reactStrictMode)
├── 📄 tailwind.config.js        # Tailwind theme, content paths, colors
├── 📄 tsconfig.json             # TypeScript paths & compiler options
├── 📄 postcss.config.js         # PostCSS plugins (Tailwind + Autoprefixer)
│
├── 📁 pages/                    # Next.js file-based routes
│   ├── 📄 _app.tsx              # Global app wrapper (ThemeProvider)
│   ├── 📄 index.tsx             # Dashboard home page (/)
│   │
│   ├── 📁 analysis/[id]/        # Dynamic analysis routes
│   │   ├── 📄 index.tsx         # /analysis/{id} — Overview
│   │   ├── 📄 findings.tsx      # /analysis/{id}/findings
│   │   ├── 📄 chains.tsx        # /analysis/{id}/chains
│   │   └── 📄 summary.tsx       # /analysis/{id}/summary
│   │
│   └── 📁 api/proxy/
│       └── 📄 [...path].ts      # CORS proxy to backend
│
├── 📁 components/
│   │
│   ├── 📄 Layout.tsx            # Legacy layout wrapper (unused)
│   │
│   ├── 📁 layout/               # App-wide layout components
│   │   ├── 📄 DashboardLayout.tsx   # Wraps Sidebar + main content
│   │   ├── 📄 Sidebar.tsx           # Collapsible navigation sidebar
│   │   ├── 📄 ThemeContext.tsx      # Light/Dark theme React context
│   │   └── 📄 ThemeToggle.tsx       # Toggle switch (sun/moon)
│   │
│   └── 📁 dashboard/            # All dashboard-specific components
│       │
│       ├── 📄 StatCard.tsx          # Metric card (Total Logs, Threats, etc.)
│       ├── 📄 ThreatLevel.tsx       # Risk score gauge / threat level bar
│       ├── 📄 Charts.tsx            # Severity bar chart + Detection donut
│       ├── 📄 UploadZone.tsx        # Drag-and-drop CSV uploader
│       ├── 📄 SeverityStats.tsx     # Critical/High/Medium/Low stat row
│       ├── 📄 EmptyState.tsx        # Empty list placeholder UI
│       ├── 📄 Pagination.tsx        # Page navigation controls
│       ├── 📄 Skeletons.tsx         # Loading skeleton for Findings page
│       ├── 📄 SummarySkeleton.tsx   # Loading skeleton for Summary page
│       ├── 📄 ExecutiveSummary.tsx  # Summary page — top-level briefing
│       ├── 📄 KeyFindings.tsx       # Summary page — key findings list
│       ├── 📄 ReportVisuals.tsx     # Summary page — visual threat charts
│       ├── 📄 SummaryStats.tsx      # Summary page — stat row
│       ├── 📄 AttackFlow.tsx        # Summary page — flow diagram
│       ├── 📄 AttackRadar.tsx       # Summary page — radar chart
│       ├── 📄 FindingsSummaryTable.tsx # Summary page — condensed findings
│       │
│       ├── 📁 findings/
│       │   ├── 📄 FindingCard.tsx       # Expandable finding row card
│       │   └── 📄 FindingsTable.tsx     # Overview page — findings preview table
│       │
│       └── 📁 attack-chains/
│           ├── 📄 AttackChains.tsx        # Overview page — chains preview
│           ├── 📄 AttackTree.tsx          # deprecated tree view
│           ├── 📄 AnimatedAttackGraph.tsx # SVG graph canvas with glow nodes + packets
│           ├── 📄 AnimatedGraphSection.tsx# Graph wrapper: header, legend, replay
│           ├── 📄 ChainCard.tsx           # Individual chain card (left panel)
│           ├── 📄 ChainDetail.tsx         # Chain detail view (right panel)
│           ├── 📄 ChainGraph.tsx          # ReactFlow-based chain graph
│           ├── 📄 ChainSkeletons.tsx      # Loading state for chains page
│           ├── 📄 ChainStats.tsx          # Chains page — summary stats row
│           └── 📄 KillChainTimeline.tsx   # Horizontal kill-chain phase timeline
│
├── 📁 lib/
│   ├── 📄 api.ts               # All API functions + fetch wrapper
│   └── 📄 utils.ts             # cn() utility for class merging
│
├── 📁 styles/
│   └── 📄 globals.css          # Tailwind directives + theme CSS variables
│
└── 📁 public/
    └── 📄 DEMO_logs.csv        # Sample CSV for "Export Sample CSV" button
```

---

## 📄 Pages Reference

### `pages/index.tsx` — Dashboard Home

| Feature | Description |
|---------|-------------|
| **Previous Analyses list** | Fetches `/scans` and displays all past uploads |
| **Upload Zone** | Drag-and-drop or click-to-browse CSV uploader |
| **Analyze button** | Triggers `POST /upload` to the backend |
| **Delete button** | `DELETE /scans/{id}` — removes scan and all data |
| **Export Sample CSV** | Downloads `DEMO_logs.csv` from `public/` |
| **Status indicators** | ✅ Completed / ⏳ Processing / ❌ Failed per scan |

---

### `pages/analysis/[id]/index.tsx` — Analysis Overview

| Section | Data Source | Description |
|---------|-------------|-------------|
| **Stat Cards** | `GET /scans/{id}` | Total Logs, Forensic Threats, Risk Density, Attack Chains |
| **Threat Level** | `GET /scans/{id}` | Risk score gauge (0–100), criticiality label |
| **Findings by Severity** | `GET /scans/{id}/categories` | Bar chart breakdown |
| **Detection Types** | `GET /scans/{id}/categories` | Donut chart |
| **Findings Preview** | `GET /scans/{id}/events` | Top 10 events table |
| **Attack Chains Preview** | `GET /scans/{id}/chains` | Condensed chain cards |

> 🎭 **Mock Note:** If the file name is `DEMO_logs.csv`, the Threat Level score is overridden to `88 / 100 CRITICAL` for demonstration purposes only.

---

### `pages/analysis/[id]/findings.tsx` — Findings Page

| Feature | Detail |
|---------|--------|
| **Severity filter** | Dropdown — All / Critical / High / Medium / Low / Info |
| **Type filter** | Dropdown — All Types / Rule-Based / ML Anomaly / Travel |
| **Findings list** | All events fetched once, filtered **client-side** |
| **Severity stats row** | Always shows totals from categories (never filtered) |
| **Pagination** | 20 items per page |
| **Severity mapping** | rule: `risk_score 9-10 → critical`, `7-8 → high`, `4-6 → medium` |

---

### `pages/analysis/[id]/chains.tsx` — Attack Chains Page

| Feature | Detail |
|---------|--------|
| **Chain cards** (left) | List of detected multi-stage attack chains |
| **Chain detail** (right) | Full phase breakdown for selected chain |
| **Live Attack Graph** | Animated SVG graph with glowing nodes + traveling packets |
| **Travel Alerts** | Impossible velocity detections table |
| **Mock fallback** | If backend returns 0 chains, 3 realistic demo chains are shown |

---

### `pages/analysis/[id]/summary.tsx` — AI Summary Page

| Feature | Detail |
|---------|--------|
| **Executive Briefing** | `GET /scans/{id}/summary` → AI-generated narrative |
| **Key Findings** | Categorised threat findings with MITRE mappings |
| **Visual Report** | Attack radar, severity heatmap, timeline |
| **Markdown render** | `react-markdown` renders the AI briefing text |

---

## 🧩 Component Reference

### Layout Components

| File | Purpose |
|------|---------|
| `DashboardLayout.tsx` | Wraps every page. Renders `<Sidebar>` + `<main>` content area |
| `Sidebar.tsx` | Left navigation rail. Collapsible. Shows **Dashboard** + **Analysis** links. Active state uses brand purple `#3B3486` |
| `ThemeContext.tsx` | React context providing `{ theme, toggleTheme }` to the whole app |
| `ThemeToggle.tsx` | Sun/moon icon button in sidebar footer. Triggers theme switch |

---

### Dashboard Components

| File | Purpose |
|------|---------|
| `StatCard.tsx` | Reusable metric card with icon, value, label, and accent color |
| `ThreatLevel.tsx` | Animated progress bar from 0–100 with color-coded risk label |
| `Charts.tsx` | Two-panel: Recharts `BarChart` (severity) + `PieChart` (types) |
| `UploadZone.tsx` | Drag-and-drop file input. Shows progress bar during upload |
| `SeverityStats.tsx` | Row of 5 colored cards: Critical / High / Medium / Low / Info |
| `EmptyState.tsx` | Friendly "no data" placeholder with icon and message |
| `Pagination.tsx` | Page navigator with prev/next and page number buttons |
| `Skeletons.tsx` | Animated skeleton loaders for the Findings page |
| `SummarySkeleton.tsx` | Animated skeleton loaders for the Summary page |

---

### Findings Components

| File | Purpose |
|------|---------|
| `FindingCard.tsx` | Expandable finding row. Shows severity badge, title, MITRE tags, affected users, and full details on expand |
| `FindingsTable.tsx` | Compact table of top findings used on the Overview page |

---

### Attack Chain Components

| File | Purpose |
|------|---------|
| `AnimatedAttackGraph.tsx` | The core SVG graph canvas. Renders glowing nodes by type (attacker/user/host/dc/target), animated gradient edges, traveling packet dots, MITRE technique labels, and a background grid |
| `AnimatedGraphSection.tsx` | Wrapper for the graph. Builds graph nodes/edges from `kill_chain_phases`. Always renders dark (theme-immune via inline styles). Includes header, live indicator, legend, replay button |
| `AttackChains.tsx` | Compact chains preview for the Overview page |
| `ChainCard.tsx` | Individual chain card showing user, phases (coloured badges), confidence bar |
| `ChainDetail.tsx` | Right-panel detail: full phase list, host info, timestamps |
| `ChainGraph.tsx` | ReactFlow-based alternative graph view |
| `ChainStats.tsx` | Summary stats: total chains, avg confidence, phases, users |
| `ChainSkeletons.tsx` | Loading skeleton for the chains page |
| `KillChainTimeline.tsx` | Horizontal kill-chain phase timeline with step numbering |

---

## 🔌 API Client Reference

**File:** `lib/api.ts`

All network calls go through the single `apiFetch()` wrapper:

```typescript
apiFetch(path, options?)
// Prepends "/api/proxy" to path
// e.g. apiFetch("/scans") → GET /api/proxy/scans → http://127.0.0.1:8000/scans
```

| Function | Endpoint Hit | Returns |
|----------|-------------|---------|
| `uploadFile(file)` | `POST /upload?user_id={uuid}` | `{ scan_id, total_logs, total_threats, risk_score }` |
| `listScans()` | `GET /scans` | `{ scans: Scan[] }` |
| `getScan(id)` | `GET /scans/{id}` | Full scan object with categories |
| `getScanCategories(id)` | `GET /scans/{id}/categories` | `{ categories: Category[] }` |
| `getScanEvents(id, params)` | `GET /scans/{id}/events` | `{ events: Event[], total }` |
| `getScanChains(id)` | `GET /scans/{id}/chains` | `{ chains: Chain[] }` |
| `getScanTravels(id)` | `GET /scans/{id}/travels` | `{ travels: Travel[] }` |
| `getScanSummary(id)` | `GET /scans/{id}/summary` | `{ summary, key_findings }` |

---

## 🌐 Proxy Bridge

**File:** `pages/api/proxy/[...path].ts`

This is a **server-side CORS bypass**. The browser calls the Next.js server, and the server forwards the request to the backend.

```
Browser → /api/proxy/scans/abc123/events?limit=50
        → Next.js server-side → http://127.0.0.1:8000/scans/abc123/events?limit=50
        → Response forwarded back to browser
```

**Why this is needed:**
- The backend at `:8000` does not set CORS headers that allow browser-origin requests from `:3000`
- By routing through Next.js, the browser only ever talks to the same origin (`:3000`)
- The server-to-server call bypasses CORS entirely

---

## 🎨 Theme System

| File | Role |
|------|------|
| `ThemeContext.tsx` | Provides `theme: "dark" \| "light"` and `toggleTheme()` |
| `ThemeToggle.tsx` | UI button (sun/moon icon) in the sidebar footer |
| `globals.css` | CSS variables: `--bg`, `--surface`, `--text-primary`, etc. |

**Dark mode** is the default and primary design. **Light mode** applies a high-contrast inversion using `#3B3486` brand purple for primary text.

> ⚠️ The **Live Attack Graph** is exempt from the theme system — it always renders dark using inline styles, giving a "radar screen" aesthetic.

---

## 🎭 Mock Data Strategy

| Component | Mock Trigger | Mock Data |
|-----------|-------------|-----------|
| **Threat Level** (Overview) | `file_name === "DEMO_logs.csv"` | Score forced to `88 / 100 CRITICAL` |
| **Attack Chains** (Chains page) | Backend returns 0 chains | 3 realistic APT chains + 2 travel alerts |
| **Live Attack Graph** | Built from `kill_chain_phases` array | Graph generated from real chain data; always has output |

All other data is **100% real** from the backend.

---

## 📂 Static Assets

| File | Location | Served At | Purpose |
|------|----------|-----------|---------|
| `DEMO_logs.csv` | `public/DEMO_logs.csv` | `/DEMO_logs.csv` | Sample log file downloaded via "Export Sample CSV" button |

To update the sample file:
```powershell
Copy-Item "C:\path\to\your\new_logs.csv" "C:\mcpantigrav\ai-cyber-forensics\frontend\public\DEMO_logs.csv" -Force
```

---

## 🛠️ Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `404 on /api/proxy/*` | Backend not running | Start LogSentinal backend on port 8000 |
| Blank dashboard list | `/scans` returned empty | Upload a CSV first |
| Upload fails | Wrong `user_id` or backend down | Check `NEXT_PUBLIC_API_URL` in `.env.local` |
| White screen on findings | No events returned | Verify the scan completed (`status: completed`) |
| CSS lint warnings | Tailwind `@apply` not recognised by CSS linter | Non-functional — the CSS works at runtime. Safe to ignore |
| Hot reload not working | Port conflict | Kill process on 3000 and rerun `npm run dev` |

---

## 📐 Conventions

| Convention | Detail |
|-----------|--------|
| **Brand colour** | `#3B3486` — used for active nav, primary buttons |
| **Risk score scale** | Backend returns raw score (e.g. `9800`). Frontend divides by `100` to get `0–100%` |
| **Severity mapping** | `risk_score 9–10 → critical`, `7–8 → high`, `4–6 → medium`, `2–3 → low`, `0–1 → info` |
| **Page loading** | Every page shows a skeleton loader while data fetches |
| **Error handling** | All API errors are caught and logged to console; UI shows empty state |
| **Type safety** | All API responses typed via interfaces in each page file |

---

*Built with ❤️ for the LogSentinal SOC Microservice v2.0*
