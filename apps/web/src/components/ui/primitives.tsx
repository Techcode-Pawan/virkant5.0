import React from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-txt-primary">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-txt-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[0.9375rem] font-semibold text-txt-primary">{children}</h2>
      {action}
    </div>
  );
}

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const DOT: Record<Tone, string> = {
  neutral: "bg-txt-faint",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function StatusDot({ tone = "neutral", className = "" }: { tone?: Tone; className?: string }) {
  return <span aria-hidden className={cx("inline-block h-2 w-2 shrink-0 rounded-full", DOT[tone], className)} />;
}

const BADGE: Record<Tone, string> = {
  neutral: "border-border-strong text-txt-muted",
  accent: "border-accent/35 text-accent",
  success: "border-success/35 text-success",
  warning: "border-warning/40 text-warning",
  danger: "border-danger/40 text-danger",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded border px-1.5 py-px text-2xs font-medium", BADGE[tone], className)}>
      {children}
    </span>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 aria-hidden className={cx("animate-spin", className)} />;
}

const ALERT_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };
const ALERT_STYLE = {
  info: "border-accent/30 bg-accent/[0.06] text-txt-primary",
  success: "border-success/30 bg-success/[0.07] text-txt-primary",
  warning: "border-warning/35 bg-warning/[0.07] text-txt-primary",
  danger: "border-danger/35 bg-danger/[0.07] text-txt-primary",
};
const ALERT_ICON_COLOR = { info: "text-accent", success: "text-success", warning: "text-warning", danger: "text-danger" };

export function InlineAlert({
  tone = "info",
  title,
  children,
  action,
  className = "",
}: {
  tone?: keyof typeof ALERT_ICON;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = ALERT_ICON[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm", ALERT_STYLE[tone], className)}>
      <Icon aria-hidden className={cx("mt-0.5 h-4 w-4 shrink-0", ALERT_ICON_COLOR[tone])} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx("text-txt-muted", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {Icon && <Icon className="mb-3 h-6 w-6 text-txt-faint" />}
      <p className="text-sm font-medium text-txt-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-txt-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded bg-elevated", className)} />;
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
