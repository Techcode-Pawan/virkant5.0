# ForgeWise AI (Vikrant 5.1)

Grounded AI assistant for industrial SOPs, OEM manuals and maintenance knowledge. Operators and engineers ask by chat or hands-free voice; answers cite the document and page they came from.

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Three.js (procedural 3D emblem)
- **Backend**: FastAPI, PyMongo (native asyncio) on **MongoDB**
- **AI**: provider-independent LLM service with adapters for Google Gemini, OpenAI (and any OpenAI-compatible API), Anthropic Claude and local Ollama, plus an offline mode that quotes documents verbatim

```
Browser ──▶ Next.js (:3000) ──/api/v1 proxy──▶ FastAPI (:8000) ──▶ MongoDB
                                                   │
                                                   └─▶ LLM service
                                                        ├─ Gemini adapter
                                                        ├─ OpenAI / compatible adapter
                                                        ├─ Anthropic adapter
                                                        ├─ Ollama adapter
                                                        ├─ Offline extractive adapter
                                                        ├─ Model selection
                                                        ├─ Fallback manager (+ provider cooldown)
                                                        ├─ Retry & timeout (bounded backoff with jitter)
                                                        └─ Error normalisation
```

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Python | 3.11 – 3.13 | `python --version` |
| Node.js | 20 LTS or newer | `node --version` |
| MongoDB | 7.0 or newer (local), or a MongoDB Atlas cluster | see section 3 |

> **Windows:** keep the project in a short path such as `C:\dev\vikrant`. Some Python wheels (lxml, used for `.docx` uploads) fail to load when the full path exceeds 260 characters.

## 2. Install and run (local development)

### Backend

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
```

Edit `apps/api/.env`: set `MONGODB_URI`, and set `JWT_SECRET` to the output of:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Start the API:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Check it: <http://127.0.0.1:8000/api/v1/health> must show `"database": {"status": "connected", ...}`. Interactive API docs: <http://127.0.0.1:8000/docs>.

### Frontend

```bash
cd apps/web
npm ci
cp .env.example .env.local        # Windows: copy .env.example .env.local
npm run dev                       # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

The browser always calls `/api/v1/...` on the same origin; Next.js forwards it to `API_PROXY_TARGET` (default `http://127.0.0.1:8000`). No backend URL is compiled into the client.

### Migrating data from the old SQLite file (optional, one time)

Earlier versions stored chats in `apps/api/forgewise.db`. Copy them into MongoDB (idempotent, read-only on the SQLite file):

```bash
cd apps/api
python scripts/migrate_sqlite_to_mongo.py --dry-run
python scripts/migrate_sqlite_to_mongo.py
```

## 3. MongoDB

The API needs `MONGODB_URI` and `MONGODB_DB_NAME`. It validates them at startup and refuses to start with a clear message if they are missing.

**Local MongoDB**
- Windows: install MongoDB Community Server (it runs as the "MongoDB" service), then use `MONGODB_URI=mongodb://127.0.0.1:27017`.
- macOS: `brew install mongodb-community && brew services start mongodb-community`.
- Docker: `docker run -d --name mongo -p 27017:27017 -v mongo_data:/data/db mongo:8.0`.

**MongoDB Atlas**
1. Create a cluster and a database user (Database Access).
2. Network Access: add your IP address (or `0.0.0.0/0` for testing only).
3. Connect → Drivers → copy the `mongodb+srv://` string.
4. URL-encode special characters in the password (`@` → `%40`, `:` → `%3A`, `/` → `%2F`).
5. `MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

**Behaviour**
- One shared connection pool is created at startup and closed on shutdown.
- On first connection the API creates indexes and seeds the default organization, the operator account `operator.rajesh@vikrant.internal`, workspace `ws-a1111111` and four pieces of equipment.
- If MongoDB is unreachable at startup the API starts in a degraded state (or exits when `MONGODB_REQUIRED_ON_STARTUP=true`). `/api/v1/health` reports `degraded`, `/api/v1/health/ready` returns 503, and database endpoints return **503 `DATABASE_UNAVAILABLE`** instead of pretending to succeed. The driver reconnects automatically.
- Credentials never appear in logs, health output or API errors (hosts are shown without user/password).

Collections: `users`, `workspaces`, `organizations`, `machines`, `documents`, `document_chunks`, `conversations`, `messages` (citations embedded), `feedback`, `audit_logs`, `user_settings`.

## 4. AI providers

All providers are optional. Configure keys in `apps/api/.env` only — they are never sent to the browser.

| Provider | Variables | Cost |
| --- | --- | --- |
| Google Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash`) | free tier available at aistudio.google.com |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`) | paid |
| OpenAI-compatible (Groq, OpenRouter, LM Studio, vLLM) | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | varies; LM Studio is free/local |
| Anthropic Claude | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-haiku-5-5`) | paid |
| Ollama (local) | `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL` (default `llama3.1:8b`), then `ollama pull llama3.1:8b` | free |

**Model selection and fallback**
- Request model (chat model picker) → workspace default (AI models page) → `LLM_PRIMARY_MODEL` → first configured provider (Gemini, OpenAI, Anthropic, Ollama).
- `LLM_FALLBACK_MODELS` (comma-separated ids from `GET /api/v1/llm/models`) defines the fallback order. If empty, every other configured provider's default model is used.
- Timeouts, HTTP 429/5xx and network errors are retried up to `LLM_MAX_RETRIES` (default 2) with exponential backoff and jitter, bounded by `LLM_TOTAL_TIMEOUT_SECONDS`. Invalid keys and bad requests move to the next model immediately.
- A provider that keeps failing is skipped for `LLM_PROVIDER_COOLDOWN_SECONDS` while other options exist, so an outage doesn't multiply API calls.
- Conversation history (last `CHAT_HISTORY_TURNS` messages) is sent with every request and trimmed to each model's context window, so switching models keeps context.
- `LLM_OFFLINE_FALLBACK=true` adds a final step that quotes the best-matching document passages verbatim. It never generates text, and the UI labels it "Offline".

Provider status (`/api/v1/llm/providers`, the dashboard and the **AI models** page) is honest: *Not configured* without a key/URL, *Configured, not yet used* until a real call or **Test connection** succeeds, then *Working*, *Recent errors* or *Temporarily unavailable*.

Embeddings: `EMBEDDING_PROVIDER=local` (default, free, offline lexical embeddings) or `auto`/`gemini`/`openai`/`ollama`. Each stored vector records which embedder produced it, so switching providers never compares incompatible vectors.

## 5. What works without API keys

| Feature | Without keys | With an LLM key / Ollama |
| --- | --- | --- |
| Sign-in, workspaces, history, equipment, analytics, admin | yes | yes |
| Upload and index PDF, DOCX, TXT, MD (local embeddings) | yes | yes |
| Chat in **Documents only** mode | yes: matching passages quoted verbatim with citations | synthesized, cited answers |
| Chat in **General assistant** mode | no: returns a clear "no AI provider configured" error | yes |
| Voice assistant (browser speech) | yes, reading the offline answers aloud | yes |
| Photo/schematic description | no | needs `VISION_PROVIDER` + matching key |

## 6. Voice assistant

Uses the browser's Web Speech API (Chrome, Edge and Safari; Firefox has no speech recognition, so typing is offered instead). It needs a secure page: `localhost` or HTTPS.

- Click **Start voice session** once. It keeps listening between questions until you press **End session**, leave the page, or a real error occurs (microphone permission denied, no microphone, speech service repeatedly unreachable).
- The end of each question is detected after a configurable silence window (default 1.4 s). The whole session can optionally stop after 5, 15 or 30 minutes of silence; the default is never.
- When the browser ends recognition on its own (silence, network blips, platform limits), it is restarted automatically; repeated immediate failures back off and show **Reconnecting**.
- While an answer is spoken, the microphone is paused so the assistant doesn't hear itself. **Stop speaking** interrupts immediately. Optional barge-in (talk over the answer) is available for headphone users.
- Chrome and Edge send audio to their own cloud speech service, so recognition needs internet even when the AI model is local.

## 7. Tests and checks

```bash
# Backend (needs a reachable MongoDB; uses and drops the database vikrant5_test)
cd apps/api
python -m pytest -q

# Frontend
cd apps/web
npm run lint
npx tsc --noEmit
npm run build
```

Set `TEST_MONGODB_URI` to run the backend tests against a MongoDB other than `mongodb://127.0.0.1:27017`.

## 8. Docker Compose

```bash
cp apps/api/.env.example apps/api/.env   # then set JWT_SECRET and any provider keys
docker compose up --build
```

Starts MongoDB 8, the API (port 8000) and the web app (port 3000).

## 9. Troubleshooting

- **`MONGODB_URI is not set`**: create `apps/api/.env` from the example.
- **Health shows `disconnected`**: check that the server is running (local) or that your IP is allow-listed (Atlas); the `error` field explains which.
- **`Authentication failed`**: wrong Atlas user/password, or the password needs URL-encoding.
- **Chat says "No AI provider is configured"**: add a key or `OLLAMA_BASE_URL` to `apps/api/.env` and restart the API, or use Documents-only mode.
- **Microphone blocked**: allow it in the site settings (padlock icon); voice requires `localhost` or HTTPS.
- **`DLL load failed ... filename or extension is too long` (Windows)**: move the project to a shorter path.

## 10. Default accounts

Sign-in is passwordless (email + role) and issues a signed JWT. Demo accounts on the sign-in page: Rajesh Sharma (operator), Elena Rostova (engineer), Marcus Vance (org admin). For production, set `APPLICATION_ENV=production`, a strong `JWT_SECRET` and `ALLOW_ROLE_SELF_SELECT=false`, and put a real identity provider in front of it.

See [CHANGELOG.md](CHANGELOG.md) for what changed in 5.1.

## License

See [LICENSE](LICENSE).
