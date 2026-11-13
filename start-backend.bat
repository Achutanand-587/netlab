@echo off
cd /d "%~dp0backend"
if not exist .venv ( py -3.12 -m venv .venv && call .venv\Scripts\activate.bat && pip install -r requirements.txt ) else ( call .venv\Scripts\activate.bat )
if not exist .env copy .env.example .env
uvicorn main:app --reload --port 8000
