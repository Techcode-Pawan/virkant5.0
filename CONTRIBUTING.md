# CONTRIBUTING.md — Contributor Guidelines

> **Project**: ForgeWise AI (Vikrant 5.0 Platform)  
> **Standards**: Strict TypeScript, Python Type Hints, Atomic Commits, GSD Protocol  

---

## 1. Development Principles
1. **Search Before You Read**: Follow the search-first discipline to minimize token pollution.
2. **Atomic Commits**: One functional unit per commit with conventional commit format: `feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`.
3. **Strict Validation**: All endpoints must validate inputs using Pydantic schemas; all client forms must validate using Zod.
4. **Empirical Verification**: Never mark a task done without automated test output or verification evidence.

---

## 2. Pull Request Workflow
1. Fork or branch from `master` using branch naming: `feature/scope-description` or `fix/issue-description`.
2. Ensure backend tests pass:
   ```bash
   cd apps/api && pytest -v
   ```
3. Ensure frontend builds without type errors:
   ```bash
   cd apps/web && npm run build
   ```
4. Verify accessibility: No new WCAG 2.2 AA violations.
5. Submit PR with full description linking to relevant requirements.
