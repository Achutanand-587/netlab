import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import settings
from database import init_db
from errors import AppError
from routers import assessments, bandwidth, capture, error_detection, experiments, health, packets, protocols, subnetting, topology

log = logging.getLogger("netlab")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="NetLab API", version=health.VERSION, lifespan=lifespan,
              description="Backend for the Integrated Network Simulation and Analysis Platform. Bandwidth data is simulated unless computed from uploaded captures.")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["*"])


def _err(status: int, code: str, message: str, details=None) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message, "details": details}}, status_code=status)


@app.exception_handler(AppError)
async def _app_error(_: Request, e: AppError):
    return _err(e.status_code, e.code, e.message, e.details)


@app.exception_handler(RequestValidationError)
async def _validation(_: Request, e: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in err["loc"][1:]) or str(err["loc"][0]), "message": err["msg"].removeprefix("Value error, ")} for err in e.errors()]
    return _err(422, "validation_error", "Request validation failed.", details)


@app.exception_handler(StarletteHTTPException)
async def _http(_: Request, e: StarletteHTTPException):
    return _err(e.status_code, "not_found" if e.status_code == 404 else "http_error", str(e.detail))


@app.exception_handler(Exception)
async def _unhandled(_: Request, e: Exception):
    log.exception("Unhandled error")
    return _err(500, "internal_error", "Something went wrong on the server.")


api = APIRouter(prefix="/api/v1")
for r in (health.router, capture.router, subnetting.router, error_detection.router, protocols.router, bandwidth.router, packets.router, topology.router, assessments.router):
    api.include_router(r)
api.include_router(experiments.router, prefix="/experiments")
api.include_router(experiments.router, prefix="/research/experiments", include_in_schema=False)  # alias used by the existing frontend
app.include_router(api)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"name": "NetLab API", "docs": "/docs", "api": "/api/v1"}
