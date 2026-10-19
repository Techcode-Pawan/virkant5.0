"use client";

import React, { useState, useEffect } from "react";
import { Shield, Users, FileText, CheckCircle2, AlertTriangle, Key } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApi } from "@/lib/api-client";
import { AdminUserItem, AuditLogItem } from "@/types";

export default function AdminConsolePage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [usersData, logsData] = await Promise.all([
          fetchApi<AdminUserItem[]>("/api/v1/admin/users"),
          fetchApi<AuditLogItem[]>("/api/v1/admin/audit-logs"),
        ]);
        setUsers(usersData);
        setAuditLogs(logsData);
      } catch (err) {
        console.error("Admin data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="border-b border-border-subtle pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-txt-primary">
          {t("admin.title")}
        </h1>
        <p className="text-xs text-txt-muted mt-1">
          Manage team member roles, review security audit trails, and monitor AI provider connections.
        </p>
      </div>

      {/* Provider Connectivity Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-txt-muted uppercase">
              LLM Inference Engine
            </span>
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="text-sm font-semibold text-txt-primary">
            Active Provider: Mock / Deterministic Industrial
          </div>
          <p className="text-[11px] text-txt-muted font-mono">
            Zero-key offline evaluation active
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-txt-muted uppercase">
              Vector Database
            </span>
            <span className="h-2 w-2 rounded-full bg-success" />
          </div>
          <div className="text-sm font-semibold text-txt-primary">
            PostgreSQL 16 + pgvector
          </div>
          <p className="text-[11px] text-txt-muted font-mono">
            Cosine similarity + tsvector index
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-txt-muted uppercase">
              Document Vault
            </span>
            <span className="h-2 w-2 rounded-full bg-success" />
          </div>
          <div className="text-sm font-semibold text-txt-primary">
            Private S3 / Supabase Storage
          </div>
          <p className="text-[11px] text-txt-muted font-mono">
            15-minute expiring signed URLs
          </p>
        </div>
      </div>

      {/* Team Members & Roles Table */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-txt-primary">
          {t("admin.members")}
        </h2>
        <div className="rounded-xl border border-border-subtle bg-surface shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border-subtle bg-elevated/40 font-mono text-[11px] uppercase tracking-wider text-txt-muted">
              <tr>
                <th className="p-4">Member</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Locale</th>
                <th className="p-4 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-elevated/20 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-txt-primary">{u.full_name}</div>
                    <div className="font-mono text-[11px] text-txt-muted">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex rounded bg-brand/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-mono uppercase text-txt-muted">
                    {u.preferred_language}
                  </td>
                  <td className="p-4 font-mono text-txt-muted text-right">
                    {u.created_at.split("T")[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Trail */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-txt-primary">
          {t("admin.auditLogs")}
        </h2>
        <div className="rounded-xl border border-border-subtle bg-surface shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-border-subtle bg-elevated/40 text-[11px] uppercase tracking-wider text-txt-muted">
              <tr>
                <th className="p-4">Event Action</th>
                <th className="p-4">Target Asset</th>
                <th className="p-4">IP Address</th>
                <th className="p-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-elevated/20 transition-colors">
                  <td className="p-4 text-txt-primary font-semibold">
                    {log.action}
                  </td>
                  <td className="p-4 text-txt-muted">
                    {log.target_id || log.target_type}
                  </td>
                  <td className="p-4 text-txt-muted">
                    {log.ip_address}
                  </td>
                  <td className="p-4 text-right text-txt-muted">
                    {log.created_at.replace("T", " ").replace("Z", "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
