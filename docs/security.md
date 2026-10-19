# Security Architecture & Operations Guide — ForgeWise AI

## 1. Authentication & JWT Validation
Every incoming request to `/api/v1/*` must pass through the authentication dependency `get_current_user` in `apps/api/app/core/security.py`.

```
Authorization: Bearer <TOKEN>
          │
          ▼
1. Decode JWT header & inspect algorithm (RS256 / HS256)
          │
          ▼
2. Validate against JWKS public key or configured secret
   ├── Expiration check ('exp' > current_time)
   ├── Issuer check ('iss' matches Supabase or identity provider)
   └── Audience check ('aud' matches application client)
          │
          ▼
3. Extract payload claims:
   ├── sub (User UUID)
   ├── org_id (Organization UUID)
   └── role (viewer | operator | engineer | knowledge_manager | org_admin)
          │
          ▼
4. Inject AuthenticatedUser into FastAPI request context
```

## 2. Multi-Tenant Isolation
- In PostgreSQL, every table has an `organization_id` foreign key.
- Repositories automatically enforce `organization_id` in `WHERE` clauses.
- Row-Level Security (RLS) policies prevent cross-tenant data leaks even if an unprivileged database connection is accessed.

## 3. Rate Limiting Rules
Implemented via Redis token bucket:
- Public IP routes: 60 requests / minute
- Chat queries: 30 requests / minute per user
- Document uploads: 10 uploads / hour per user
- Exceeding quota returns HTTP 429 Too Many Requests with `Retry-After: <seconds>`
