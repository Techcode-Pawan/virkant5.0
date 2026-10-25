import asyncio
import time
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

Base = declarative_base()

# Configure engine with short connection timeout
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.APPLICATION_ENV == "development" and settings.LOG_LEVEL == "DEBUG"),
    future=True,
    pool_pre_ping=True,
    connect_args={"timeout": 0.5} if "asyncpg" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

_db_available = None
_last_check_time = 0.0

async def check_db_availability() -> bool:
    global _db_available, _last_check_time
    now = time.time()
    # Cache DB status for 15 seconds to eliminate connection latency
    if _db_available is not None and (now - _last_check_time) < 15.0:
        return _db_available

    try:
        session = AsyncSessionLocal()
        conn = await asyncio.wait_for(session.connection(), timeout=0.4)
        _db_available = True
        _last_check_time = now
        await session.close()
        return True
    except Exception:
        _db_available = False
        _last_check_time = now
        return False

async def get_db_session() -> AsyncGenerator[Optional[AsyncSession], None]:
    is_available = await check_db_availability()
    if not is_available:
        # PostgreSQL is offline -> gracefully yield None so services run in ultra-low latency fallback mode
        yield None
        return

    session = AsyncSessionLocal()
    try:
        yield session
        try:
            await session.commit()
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
    finally:
        try:
            await session.close()
        except Exception:
            pass
