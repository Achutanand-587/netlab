# NetLab: Interactive Networking Learning and Analysis Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Python Tests](https://img.shields.io/badge/Pytest-77%20Passed-brightgreen?style=flat&logo=pytest&logoColor=white)](https://docs.pytest.org)

**NetLab** is an integrated computer networking simulation, analysis, and educational platform. It brings together real-world packet inspection, live network sniffing, interactive protocol sequence ladder diagrams, graphical topology simulation, bandwidth analysis, subnetting calculators, error-detection algorithms, structured learning courses, and an assessment engine into a unified web application.

---

## 🌟 Key Modules & Features

1. **Dashboard (`/`)**: Real-time network telemetry, simulated throughput meters, recent experiments, and system connectivity health.
2. **Live Packet Analyzer (`/packets` - Live tab)**: Real-time packet sniffing on Wi-Fi and Ethernet adapters using Scapy and Npcap with live WebSocket streaming and BPF filters.
3. **PCAP Analyzer (`/packets` - PCAP tab)**: Upload and analyze `.pcap`, `.pcapng`, and `.cap` captures. View protocol breakdowns, filter packets, view Hex/ASCII payload dumps, and export to CSV.
4. **Protocol Learning Lab (`/protocols`)**: Interactive step-by-step visual dissection of 7 key protocols: **TCP, UDP, DNS, DHCP, ARP, HTTP, and ICMP**. Features canonical fixed lifelines (Client Left, Server Right) and gliding packet animations.
5. **Network Topology Simulator (`/topology`)**: Design multi-node networks (PCs, Routers, Switches, Servers) on an SVG canvas, configure link latencies/losses, compute Dijkstra shortest paths, and simulate link failures.
6. **Bandwidth Monitor (`/bandwidth`)**: Monitor throughput across three distinct provenance models: **LIVE** interface telemetry, **VIRTUAL** synthetic curves, and **IMPORTED** PCAP throughput graphs.
7. **Subnetting Calculator (`/subnetting`)**: Complete IPv4 subnet calculator, 32-bit binary breakdown, address classification, and VLSM subnet splitting.
8. **Error Detection Lab (`/errors`)**: Interactive bit-level exploration of Parity, Internet Checksum (RFC 1071), CRC (Cyclic Redundancy Check), and Hamming (7,4) Code with manual bit-flipping noise simulation.
9. **Learning Center (`/learn`)**: Structured educational curriculum with concept explanations, knowledge check quizzes, and direct launch buttons to practical lab tools.
10. **Quizzes & Assessments (`/assessments`)**: Multi-category testing system (Topic, Difficulty, Practical, Custom) with 6 question formats, instant scoring, weak-topic analysis, and attempt history.
11. **Experiment History (`/reports`)**: Central repository tracking inputs, outputs, and execution metrics across all practical lab sessions.
12. **Research & Reports (`/reports`)**: Data visualization, side-by-side metric comparison, and CSV/JSON report exports.
13. **System Settings (`/settings`)**: Connection tester, database health indicators, and theme customizer (Dark / Light mode).

---

## 📐 System Architecture

NetLab follows a clean client-server architecture:

```
netlab-full/
├── frontend/               # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/     # Reusable UI components & visualizers
│   │   ├── pages/          # 13 Application pages
│   │   └── services/       # Typed API client services
│   └── package.json
├── backend/                # Python 3.12+ FastAPI backend
│   ├── models/             # SQLAlchemy ORM models (SQLite)
│   ├── routers/            # FastAPI endpoint routers
│   ├── schemas/            # Pydantic validation schemas
│   ├── services/           # Networking, capture & simulation engines
│   ├── tests/              # 77 automated Pytest unit/integration tests
│   └── main.py             # ASGI application entrypoint
├── docs/                   # Full documentation suite
│   ├── ARCHITECTURE.md     # In-depth architectural & dataflow design
│   └── USER_GUIDE.md        # Comprehensive student & user handbook
├── start-backend.bat       # Windows 1-click backend starter
├── start-frontend.bat      # Windows 1-click frontend starter
└── README.md
```

---

## 💻 System Requirements

- **Operating System**: Windows 10/11, Linux, or macOS.
- **Python**: Version 3.12 or newer.
- **Node.js**: Version 18.0 or newer (npm included).
- **Packet Sniffing Driver (Windows)**:
  - To enable **real physical packet capture** on Windows, install [Npcap](https://npcap.com/).
  - During Npcap setup, ensure **"Install Npcap in WinPcap API-compatible Mode"** is checked.
  - *Note: All protocol simulations, topology pathfinding, subnetting, and PCAP analysis work fully without Npcap.*

---

## 🚀 Quick Start Guide

### Option 1: One-Click Startup (Windows)
1. Double-click `start-backend.bat` (starts FastAPI on `http://127.0.0.1:8000`).
2. Double-click `start-frontend.bat` (starts Vite dev server on `http://127.0.0.1:5173`).
3. Open your browser at `http://127.0.0.1:5173`.

### Option 2: Manual Terminal Startup

**Terminal 1 — Backend:**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive API Documentation: `http://127.0.0.1:8000/docs`

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm install
npm run dev
```
- Frontend Application: `http://127.0.0.1:5173`

---

## 🧪 Verification & Testing

### 1. Run Backend Automated Test Suite
From the `backend` directory:
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```
*Expected Result: 77 tests passed.*

### 2. Run Frontend TypeScript Typecheck
From the `frontend` directory:
```powershell
cd frontend
npx tsc --noEmit
```
*Expected Result: Exits with code 0 (zero compiler errors).*

### 3. Build Frontend for Production
From the `frontend` directory:
```powershell
cd frontend
npx vite build
```
*Expected Result: Production bundle generated in `frontend/dist/`.*

---

## 🔒 Data Provenance Guarantee

NetLab strictly distinguishes and labels all displayed networking data:
- **`LIVE`**: Sampled directly from real physical network interfaces or host OS telemetry.
- **`IMPORTED`**: Extracted from recorded `.pcap` capture files uploaded by the user.
- **`VIRTUAL`**: Deterministic educational models and state machines. NetLab never represents simulated data as live network traffic.

---

## 📄 License & Academic Integrity
Developed as a Computer Networks (DCN) laboratory and analysis system. Free for educational and research use.
