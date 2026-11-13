from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from config import settings


class Base(DeclarativeBase):
    pass


_kw: dict = {}
if settings.database_url.startswith("sqlite"):
    _kw["connect_args"] = {"check_same_thread": False}
    if settings.database_url in ("sqlite://", "sqlite:///:memory:"):
        _kw["poolclass"] = StaticPool
engine = create_engine(settings.database_url, **_kw)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import models  # noqa: F401  (registers tables)

    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print(f"Database initialised: {settings.database_url}")
