from datetime import timedelta
from typing import List

from app.db.mongo import DOCUMENTS, MACHINES, MESSAGES, get_db, utcnow
from app.schemas.analytics import AnalyticsOverview, CommonIssueItem


class AnalyticsService:
    """All figures are computed from stored messages and documents — nothing is estimated."""

    async def get_overview(self, organization_id: str) -> AnalyticsOverview:
        db = get_db()
        since = utcnow() - timedelta(days=30)
        base = {"organization_id": organization_id, "created_at": {"$gte": since}}

        total_queries = await db[MESSAGES].count_documents({**base, "sender": "user"})
        answers = await db[MESSAGES].count_documents({**base, "sender": "assistant"})
        grounded = await db[MESSAGES].count_documents({**base, "sender": "assistant", "groundedness_status": "supported"})
        gaps = await db[MESSAGES].count_documents({**base, "sender": "assistant", "groundedness_status": "insufficient_evidence"})
        docs = await db[DOCUMENTS].count_documents({"organization_id": organization_id})

        latency_rows = [r async for r in await db[MESSAGES].aggregate([
            {"$match": {**base, "sender": "assistant", "latency_ms": {"$type": "number"}}},
            {"$group": {"_id": None, "avg": {"$avg": "$latency_ms"}}},
        ])]
        users = [r async for r in await db[MESSAGES].aggregate([
            {"$match": {**base, "sender": "user"}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "n"},
        ])]

        return AnalyticsOverview(
            total_queries_last_30d=total_queries,
            grounded_percentage=round(grounded / answers * 100, 1) if answers else 0.0,
            average_retrieval_latency_ms=int(latency_rows[0]["avg"]) if latency_rows else 0,
            unanswered_knowledge_gaps_count=gaps,
            documents_indexed_count=docs,
            active_operators_count=users[0]["n"] if users else 0,
            assistant_answers_last_30d=answers,
        )

    async def get_common_issues(self, organization_id: str) -> List[CommonIssueItem]:
        """Most-asked topics per machine over the last 30 days (by conversation title)."""
        db = get_db()
        since = utcnow() - timedelta(days=30)
        rows = [r async for r in await db[MESSAGES].aggregate([
            {"$match": {"organization_id": organization_id, "sender": "assistant", "created_at": {"$gte": since},
                        "machine_id": {"$nin": [None, ""]}}},
            {"$group": {
                "_id": "$machine_id",
                "frequency": {"$sum": 1},
                "gaps": {"$sum": {"$cond": [{"$eq": ["$groundedness_status", "insufficient_evidence"]}, 1, 0]}},
                "last_conversation": {"$last": "$conversation_id"},
            }},
            {"$sort": {"frequency": -1}},
            {"$limit": 5},
        ])]
        if not rows:
            return []
        names = {m["machine_id"]: m["name"] async for m in db[MACHINES].find({"organization_id": organization_id})}
        convs = {
            c["_id"]: c.get("title", "")
            async for c in db["conversations"].find({"_id": {"$in": [r["last_conversation"] for r in rows]}}, {"title": 1})
        }
        return [
            CommonIssueItem(
                machine_id=r["_id"],
                machine_name=names.get(r["_id"], r["_id"]),
                topic=convs.get(r["last_conversation"], "Recent question"),
                frequency=r["frequency"],
                resolution_status="Knowledge gap" if r["gaps"] else "Documented in SOP",
            )
            for r in rows
        ]
