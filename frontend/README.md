# NetLab – Integrated Network Simulation and Analysis Platform
## Run on Windows (PowerShell)
1. Install Node.js 18+ from nodejs.org.
2. `cd netlab`
3. `npm install`
4. `copy .env.example .env` (optional; leave `VITE_API_BASE_URL` empty for Demo Mode)
5. `npm run dev` then open http://localhost:5173
Build check: `npm run build`.
## FastAPI later
Set `VITE_API_BASE_URL=http://localhost:8000/api`, add CORS (`CORSMiddleware`, origin `http://localhost:5173`), and implement the routes in `src/services/api.ts` (`/health`, `/subnetting/calculate`, ...). Settings → "Check connection" calls `/health`.
## Status
Built: shell, dark/light theme, dashboard (simulated data), subnetting, error detection (parity, checksum, CRC), API client, settings. Other modules show an honest "not built yet" page.
