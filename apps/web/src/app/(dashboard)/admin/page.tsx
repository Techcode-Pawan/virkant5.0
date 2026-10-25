"use client";

import React, { useEffect, useState } from "react";
import { InlineAlert, PageHeader, SectionTitle, Skeleton } from "@/components/ui/primitives";
import { errorMessage, fetchApi } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import type { AdminUserItem, AuditLogItem } from "@/types";

const ACTION_LABEL: Record<string, string> = {
  SIGN_IN: "Signed in",
  DOCUMENT_UPLOAD: "Uploaded document",
  DOCUMENT_DELETE: "Deleted document",
  MACHINE_REGISTERED: "Registered equipment",
  PROVIDER_KEYS_UPDATED: "Changed provider keys",
};

export default function AdminPage() {
  const { session } = useSession();
  const [users, setUsers] = useState<AdminUserItem[] | null>(null);
  const [logs, setLogs] = useState<AuditLogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchApi<AdminUserItem[]>("/api/v1/admin/users"), fetchApi<AuditLogItem[]>("/api/v1/admin/audit-logs")])
      .then(([u, l]) => {
        setUsers(u);
        setLogs(l);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader title="Admin" description={`People and activity in ${session?.organization_name || "your organization"}.`} />
      {error && <InlineAlert tone="danger" title="Admin data unavailable">{error}</InlineAlert>}

      <section>
        <SectionTitle>Members</SectionTitle>
        {!users && !error && <Skeleton className="h-24" />}
        {users && (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-txt-muted">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Language</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <p className="text-txt-primary">{u.full_name || u.email}</p>
                      <p className="text-xs text-txt-faint">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-txt-muted">{u.role.replace("_", " ")}</td>
                    <td className="px-4 py-3 uppercase text-txt-muted">{u.preferred_language}</td>
                    <td className="px-4 py-3 text-txt-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Audit trail</SectionTitle>
        {logs && logs.length === 0 && <p className="text-sm text-txt-muted">No audited actions yet.</p>}
        {logs && logs.length > 0 && (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-txt-muted">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Target</th>
                  <th className="px-4 py-2.5 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-txt-muted">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{ACTION_LABEL[l.action] || l.action}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-txt-muted">{l.target_id}</td>
                    <td className="px-4 py-3 text-txt-faint">{l.ip_address || "n/a"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
