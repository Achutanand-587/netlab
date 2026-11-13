# NetLab backend (FastAPI)

Backend for the Integrated Network Simulation and Analysis Platform. It serves `/api/v1` and was built to match the existing React frontend's `src/services/api.ts` (see `docs/API_CONTRACT.md`).

**Implemented:** subnetting, PCAP/PCAPNG packet analyzer, error detection (parity, Internet checksum, CRC), bandwidth (simulated series and real throughput from uploaded captures or supplied samples), protocol simulations, topology CRUD + pathfinding, experiments (history, compare, CSV, reports).
**Not implemented on purpose:** live packet capture (`live_capture_enabled` is always `false`), authentication, real telemetry collection.

## Run on Windows (PowerShell)
Requires Python 3.12+ from python.org (tick "Add to PATH").
```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope Process Bypass
pip install -r requirements.txt
copy .env.example .env
python database.py                  # creates netlab.db (also created automatically on startup)
uvicorn main:app --reload --port 8000
```
Open http://localhost:8000/docs for interactive OpenAPI docs. Health check: http://localhost:8000/api/v1/health

macOS/Linux: use `python3 -m venv .venv && source .venv/bin/activate` and `cp .env.example .env`.

## Tests
```powershell
pytest
```
60 tests use an in-memory SQLite database and never touch `netlab.db`.

## Configuration (`.env`, never committed)
| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./netlab.db` | SQLAlchemy URL |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | CORS, comma-separated |
| `MAX_UPLOAD_MB` | `10` | Upload size limit |
| `MAX_PACKETS` | `50000` | Per-capture packet limit |

## Layout
`main.py` app + error handlers · `routers/` HTTP · `schemas/` Pydantic · `services/` logic · `models/` SQLAlchemy · `database.py` · `sample_data/` (`sample_mixed.pcap` is synthetic; regenerate with `python sample_data/make_sample_pcap.py`) · `tests/` · `docs/API_CONTRACT.md`.

## Security notes
Uploads are size-capped while streaming, extension- and magic-number-checked, parsed from a temp file that is always deleted, and never executed. Sample loading uses an allow-list (no user paths). CSV exports neutralise formula injection. Parsing untrusted captures with Scapy is the main risk: keep this service on localhost / a trusted network and add authentication before exposing it.

## Known limitations
No auth or rate limiting; no migrations tool (tables are created with `create_all`); timestamps are naive UTC; large captures are parsed synchronously in a worker thread.
