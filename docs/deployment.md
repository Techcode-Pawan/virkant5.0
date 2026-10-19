# Production Deployment & Domain Verification Guide — ForgeWise AI

## 1. Production Architecture
In production, ForgeWise AI is deployed as two decoupled containers alongside managed cloud database and cache services:
- **Frontend Container**: Next.js 15 standalone build deployed on Vercel, AWS ECS, or Google Cloud Run.
- **Backend Container**: FastAPI ASGI service served via Uvicorn/Gunicorn on AWS ECS, GCP Cloud Run, or Kubernetes.
- **Managed Database**: Supabase PostgreSQL 16 (or AWS RDS PostgreSQL with `pgvector`).
- **Managed Cache**: Upstash Redis or AWS ElastiCache.
- **Private Storage**: Supabase Storage or AWS S3 private bucket.

---

## 2. Custom Domain & DNS Setup
To connect your organization's custom domain (e.g. `sop.yourplant.com`):

1. **Frontend DNS Configuration**:
   - Add a `CNAME` record pointing `sop.yourplant.com` to `cname.vercel-dns.com` (or your cloud load balancer hostname).
   - Alternatively, add an `A` record pointing to your ingress static IP.
2. **Backend API DNS Configuration**:
   - Add a `CNAME` record for `api.sop.yourplant.com` pointing to the backend ingress.
3. **TLS / HTTPS**:
   - Automated Let's Encrypt certificates are provisioned upon domain DNS propagation.
   - Set `NEXT_PUBLIC_API_BASE_URL=https://api.sop.yourplant.com`.
   - Update backend `CORS_ALLOWED_ORIGINS="https://sop.yourplant.com"`.

---

## 3. Production Readiness Checklist

Before marking the deployment ready for plant floor operators, complete this checklist:

- [ ] Custom domain DNS mapped and HTTPS verified.
- [ ] Production database migrations executed via `alembic upgrade head`.
- [ ] Database connection pool limits configured for target concurrency.
- [ ] Redis cluster configured for rate-limiting.
- [ ] Private storage bucket created with zero public access.
- [ ] 15-minute signed URL policy validated.
- [ ] AI provider API keys configured in secret manager (Azure OpenAI / Gemini / Bedrock).
- [ ] Supabase Auth production JWT secrets configured and verified.
- [ ] EHS safety warning copy confirmed by plant safety officer.
- [ ] `PRIVACY_POLICY.md` updated with actual corporate entity and DPO contact.
- [ ] Automated health checks (`/api/v1/health`) connected to pager / monitoring system.
- [ ] Rolling database backups scheduled (30-day retention).
