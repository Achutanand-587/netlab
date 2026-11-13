import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./netlab.db")
        self.allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
        self.max_upload_bytes = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024
        self.max_packets = int(os.getenv("MAX_PACKETS", "50000"))
        self.live_capture_enabled = True
        self.max_live_packets = int(os.getenv("MAX_LIVE_PACKETS", "10000"))
        self.max_capture_seconds = int(os.getenv("MAX_CAPTURE_SECONDS", "900"))


settings = Settings()
