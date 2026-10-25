"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History, Search, Trash2 } from "lucide-react";
import { EmptyState, formatRelative, InlineAlert, PageHeader, Skeleton, Spinner } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/api-client";
import { deleteConversation, listConversations, MODE_LABEL } from "@/lib/chat";
import { useSession } from "@/lib/session";
import type { ConversationSummary } from "@/types";

export default function HistoryPage() {
  const { session } = useSession();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listConversations(200));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, session?.workspace_id]);

  const filtered = useMemo(
    () => (items || []).filter((c) => !query.trim() || c.title.toLowerCase().includes(query.toLowerCase()) || c.machine_id?.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await deleteConversation(id);
      setItems((prev) => prev?.filter((c) => c.id !== id) ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="History"
        description={`Chat and voice conversations in ${session?.workspace_name || "this workspace"}, stored in MongoDB.`}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-txt-faint" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles or equipment" className="field pl-9" aria-label="Search conversations" />
      </div>
      {error && <InlineAlert tone="danger" className="mb-4" action={<button onClick={load} className="btn-ghost h-7 px-2 text-xs">Retry</button>}>{error}</InlineAlert>}
      <div className="panel divide-y divide-border-subtle">
        {items === null && !error && <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
        {items && filtered.length === 0 && (
          <EmptyState
            icon={History}
            title={items.length ? "No conversations match" : "No conversations yet"}
            description={items.length ? "Try a different search." : "Conversations from chat and the voice assistant appear here."}
            action={!items.length && <Link href="/chat" className="btn-secondary h-8">Start a chat</Link>}
          />
        )}
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/chat?c=${c.id}`} className="min-w-0 flex-1 rounded focus-visible:outline-offset-4">
              <p className="truncate text-sm text-txt-primary hover:underline">{c.title}</p>
              <p className="mt-0.5 text-xs text-txt-faint">
                {MODE_LABEL[c.mode] || c.mode}
                {c.machine_id ? `, ${c.machine_id}` : ""}
                {c.last_model ? `, ${c.last_model}` : ""}, {c.message_count} messages
              </p>
            </Link>
            <span className="hidden shrink-0 text-xs text-txt-faint sm:inline">{formatRelative(c.updated_at)}</span>
            {confirming === c.id ? (
              <span className="flex shrink-0 items-center gap-1">
                <button onClick={() => remove(c.id)} disabled={deleting === c.id} className="btn-danger h-7 px-2 text-xs">
                  {deleting === c.id ? <Spinner className="h-3.5 w-3.5" /> : null} Delete
                </button>
                <button onClick={() => setConfirming(null)} className="btn-ghost h-7 px-2 text-xs">Cancel</button>
              </span>
            ) : (
              <button onClick={() => setConfirming(c.id)} className="icon-btn h-8 w-8 shrink-0" aria-label={`Delete ${c.title}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
