"""
Centralized MongoDB connection management.

A single AsyncMongoClient (with its own connection pool) is created at startup
and shared by every request. PyMongo reconnects transparently when the server
comes back, so a temporary outage only fails the requests made during it; those
surface to clients as HTTP 503 instead of silently pretending to succeed.
"""
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from urllib.parse import unquote

from pymongo import AsyncMongoClient, ASCENDING, DESCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import (
    AutoReconnect,
    ConfigurationError,
    ConnectionFailure,
    NetworkTimeout,
    OperationFailure,
    PyMongoError,
    ServerSelectionTimeoutError,
)

from app.core.exceptions import DatabaseUnavailableError
from app.core.logging import app_logger

# Collection names
ORGANIZATIONS = "organizations"
WORKSPACES = "workspaces"
USERS = "users"
MACHINES = "machines"
DOCUMENTS = "documents"
CHUNKS = "document_chunks"
CONVERSATIONS = "conversations"
MESSAGES = "messages"
FEEDBACK = "feedback"
AUDIT_LOGS = "audit_logs"
USER_SETTINGS = "user_settings"

# Errors that mean "the server is unreachable right now" rather than a bad query.
CONNECTIVITY_ERRORS = (ServerSelectionTimeoutError, ConnectionFailure, AutoReconnect, NetworkTimeout)

INDEXES: Dict[str, list] = {
    USERS: [IndexModel([("email", ASCENDING)], unique=True), IndexModel([("organization_id", ASCENDING)])],
    WORKSPACES: [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)])],
    MACHINES: [IndexModel([("organization_id", ASCENDING), ("machine_id", ASCENDING)], unique=True)],
    DOCUMENTS: [
        IndexModel([("workspace_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("organization_id", ASCENDING)]),
    ],
    CHUNKS: [
        IndexModel([("document_id", ASCENDING), ("chunk_index", ASCENDING)]),
        IndexModel([("workspace_id", ASCENDING)]),
    ],
    CONVERSATIONS: [IndexModel([("user_id", ASCENDING), ("workspace_id", ASCENDING), ("updated_at", DESCENDING)])],
    MESSAGES: [
        IndexModel([("conversation_id", ASCENDING), ("created_at", ASCENDING)]),
        IndexModel([("organization_id", ASCENDING), ("created_at", DESCENDING)]),
    ],
    FEEDBACK: [IndexModel([("message_id", ASCENDING), ("user_id", ASCENDING)], unique=True)],
    AUDIT_LOGS: [IndexModel([("organization_id", ASCENDING), ("created_at", DESCENDING)])],
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value) if value is not None else utcnow().isoformat()


def redact_uri(uri: str) -> str:
    """Returns scheme://host[,host...]/ with any credentials removed."""
    if not uri:
        return ""
    scheme, _, rest = uri.partition("://")
    netloc = rest.split("/", 1)[0].split("?", 1)[0]
    hosts = netloc.rsplit("@", 1)[-1]
    return f"{scheme}://{hosts}"


def _uri_password(uri: str) -> Optional[str]:
    rest = uri.partition("://")[2]
    netloc = rest.split("/", 1)[0]
    if "@" not in netloc:
        return None
    userinfo = netloc.rsplit("@", 1)[0]
    if ":" not in userinfo:
        return None
    return userinfo.split(":", 1)[1]


def describe_mongo_error(exc: BaseException, uri: str = "") -> str:
    """Human-readable, credential-free description of a connection failure."""
    host = redact_uri(uri)
    if isinstance(exc, OperationFailure) and (exc.code in (18, 8000) or "auth" in str(exc).lower()):
        msg = "Authentication failed. Check the username/password in MONGODB_URI and the user's database permissions."
    elif isinstance(exc, ServerSelectionTimeoutError):
        msg = (
            f"Could not reach MongoDB at {host or 'the configured host'} before the timeout. "
            "Make sure the server is running (local) or that your IP is allow-listed (Atlas)."
        )
    elif isinstance(exc, ConfigurationError):
        msg = f"Invalid MongoDB configuration: {exc}"
    elif isinstance(exc, CONNECTIVITY_ERRORS):
        msg = f"Lost connection to MongoDB at {host or 'the configured host'}."
    else:
        msg = f"MongoDB error: {exc.__class__.__name__}"
    password = _uri_password(uri) if uri else None
    if password:
        msg = msg.replace(password, "***").replace(unquote(password), "***")
    return msg


class MongoManager:
    def __init__(self) -> None:
        self._client: Optional[AsyncMongoClient] = None
        self._db: Optional[AsyncDatabase] = None
        self._uri: str = ""
        self._db_name: str = ""
        self._indexes_ready = False
        self.last_error: Optional[str] = None
        self.last_ok_at: Optional[datetime] = None
        self.last_latency_ms: Optional[float] = None

    @property
    def configured(self) -> bool:
        return self._client is not None

    @property
    def connected(self) -> bool:
        return self._client is not None and self.last_error is None and self.last_ok_at is not None

    async def connect(
        self,
        uri: str,
        db_name: str,
        server_selection_timeout_ms: int = 5000,
        connect_timeout_ms: int = 5000,
        max_pool_size: int = 50,
    ) -> bool:
        """Creates the shared client and verifies the server. Returns True when reachable."""
        self._uri = uri
        self._db_name = db_name
        try:
            self._client = AsyncMongoClient(
                uri,
                appname="forgewise-api",
                serverSelectionTimeoutMS=server_selection_timeout_ms,
                connectTimeoutMS=connect_timeout_ms,
                socketTimeoutMS=30000,
                maxPoolSize=max_pool_size,
                retryWrites=True,
                retryReads=True,
                tz_aware=True,
            )
        except PyMongoError as exc:
            self.last_error = describe_mongo_error(exc, uri)
            self._client = None
            app_logger.error(f"MongoDB client could not be created: {self.last_error}")
            return False
        self._db = self._client[db_name]
        ok = await self.ping()
        if ok:
            await self.ensure_indexes()
        return ok

    async def ping(self) -> bool:
        if self._client is None:
            return False
        started = time.perf_counter()
        try:
            await self._client.admin.command("ping")
        except PyMongoError as exc:
            self.last_error = describe_mongo_error(exc, self._uri)
            self.last_latency_ms = None
            return False
        self.last_latency_ms = round((time.perf_counter() - started) * 1000, 1)
        self.last_ok_at = utcnow()
        if self.last_error:
            app_logger.info("MongoDB connection restored.")
        self.last_error = None
        return True

    async def ensure_indexes(self) -> None:
        if self._db is None or self._indexes_ready:
            return
        try:
            for collection, models in INDEXES.items():
                await self._db[collection].create_indexes(models)
            self._indexes_ready = True
        except PyMongoError as exc:
            app_logger.error(f"Failed to create MongoDB indexes: {describe_mongo_error(exc, self._uri)}")

    def mark_failure(self, exc: BaseException) -> None:
        self.last_error = describe_mongo_error(exc, self._uri)

    @property
    def db(self) -> AsyncDatabase:
        if self._db is None:
            raise DatabaseUnavailableError(self.last_error or "MongoDB is not configured.")
        return self._db

    async def status(self) -> Dict[str, Any]:
        if self._client is None:
            return {
                "status": "not_configured" if not self._uri else "disconnected",
                "database": self._db_name or None,
                "host": redact_uri(self._uri) or None,
                "error": self.last_error,
            }
        ok = await self.ping()
        if ok and not self._indexes_ready:
            await self.ensure_indexes()
        return {
            "status": "connected" if ok else "disconnected",
            "database": self._db_name,
            "host": redact_uri(self._uri),
            "latency_ms": self.last_latency_ms,
            "last_ok_at": iso(self.last_ok_at) if self.last_ok_at else None,
            "error": self.last_error,
        }

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
        self._client = None
        self._db = None
        self._indexes_ready = False


mongo = MongoManager()


def get_db() -> AsyncDatabase:
    """FastAPI dependency / helper returning the shared database handle."""
    return mongo.db
