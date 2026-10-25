import {
  BarChart3,
  Cpu,
  FileText,
  History,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Settings,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import type { ComponentType } from "react";
import type { UserRole } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  minRole?: UserRole;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Every entry maps to a real route in app/(dashboard).
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Assistant",
    items: [
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/voice", label: "Voice assistant", icon: Mic },
      { href: "/history", label: "History", icon: History },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/documents", label: "SOP library", icon: FileText },
      { href: "/machines", label: "Equipment", icon: Cpu },
    ],
  },
  {
    label: "Insights & system",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/models", label: "AI models", icon: SlidersHorizontal },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: Shield, minRole: "org_admin" },
    ],
  },
];

export const ROLE_LEVEL: Record<string, number> = {
  viewer: 1,
  operator: 2,
  engineer: 3,
  knowledge_manager: 4,
  org_admin: 5,
  platform_admin: 6,
};

export function pageTitle(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return item.label;
    }
  }
  return "";
}
