"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AIModelCode, LanguageCode, UserRole, UserSession, WorkspaceInfo } from "@/types";
import { AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY, fetchApi } from "./api-client";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SignInOptions {
  newWorkspace?: boolean;
  fullName?: string;
}

interface SessionContextType {
  session: UserSession | null;
  status: SessionStatus;
  isLoading: boolean;
  activeWorkspaceId: string;
  workspaces: WorkspaceInfo[];
  /** null = use the workspace/server default model */
  selectedModel: AIModelCode | null;
  selectedLanguage: LanguageCode;
  signIn: (email: string, role: UserRole, preferredLanguage?: LanguageCode, options?: SignInOptions) => Promise<UserSession>;
  signOut: () => void;
  createNewWorkspace: (name?: string) => Promise<WorkspaceInfo>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  setSelectedModel: (model: AIModelCode | null) => void;
  setSelectedLanguage: (lang: LanguageCode) => void;
}

const SESSION_KEY = "forgewise_session";
const MODEL_KEY = "forgewise_selected_model";
const LANG_KEY = "forgewise_lang";

const SessionContext = createContext<SessionContextType | null>(null);

function store(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — session lives in memory only */
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function toSession(r: any): UserSession {
  return {
    token: r.token,
    session_id: r.session_id,
    user_id: r.user_id,
    email: r.email,
    full_name: r.full_name,
    role: r.role,
    organization_id: r.organization_id,
    organization_name: r.organization_name,
    workspace_id: r.workspace_id,
    workspace_name: r.workspace_name,
    preferred_language: r.preferred_language,
    created_at: r.created_at,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [selectedModel, setSelectedModelState] = useState<AIModelCode | null>(null);
  const [selectedLanguage, setSelectedLanguageState] = useState<LanguageCode>("en");

  const persist = useCallback((s: UserSession | null) => {
    setSession(s);
    setStatus(s ? "authenticated" : "anonymous");
    store(AUTH_TOKEN_KEY, s?.token ?? null);
    store(SESSION_KEY, s ? JSON.stringify(s) : null);
  }, []);

  // Restore and verify a stored session once on load.
  useEffect(() => {
    const model = read(MODEL_KEY);
    if (model) setSelectedModelState(model);
    const lang = read(LANG_KEY) as LanguageCode | null;
    if (lang) setSelectedLanguageState(lang);

    const raw = read(SESSION_KEY);
    const token = read(AUTH_TOKEN_KEY);
    if (!raw || !token) {
      setStatus("anonymous");
      return;
    }
    let cached: UserSession | null = null;
    try {
      cached = JSON.parse(raw);
    } catch {
      cached = null;
    }
    if (!cached) {
      persist(null);
      return;
    }
    setSession(cached);
    fetchApi<any>("/api/v1/auth/me")
      .then((me) => {
        const fresh = { ...cached!, full_name: me.full_name, role: me.role, workspace_id: me.workspace_id, workspace_name: me.workspace_name };
        persist(fresh);
      })
      .catch((err) => {
        // Expired/invalid token → sign out. Backend unreachable → keep the cached session (UI shows offline state).
        if (err?.status === 401) persist(null);
        else setStatus("authenticated");
      });
  }, [persist]);

  useEffect(() => {
    const onExpired = () => persist(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [persist]);

  const refreshWorkspaces = useCallback(async () => {
    try {
      setWorkspaces(await fetchApi<WorkspaceInfo[]>("/api/v1/auth/workspaces"));
    } catch {
      /* leave previous list; the switcher shows the active workspace from the session */
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") refreshWorkspaces();
  }, [status, session?.workspace_id, refreshWorkspaces]);

  const signIn = useCallback(
    async (email: string, role: UserRole, preferredLanguage: LanguageCode = "en", options: SignInOptions = {}) => {
      const response = await fetchApi<any>("/api/v1/auth/session", {
        method: "POST",
        body: JSON.stringify({
          email,
          role,
          preferred_language: preferredLanguage,
          full_name: options.fullName || undefined,
          new_workspace: options.newWorkspace ?? false,
        }),
      });
      const next = toSession(response);
      persist(next);
      return next;
    },
    [persist],
  );

  const signOut = useCallback(() => {
    persist(null);
    setWorkspaces([]);
  }, [persist]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      const response = await fetchApi<any>("/api/v1/auth/workspace/switch", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      persist(toSession(response));
    },
    [persist],
  );

  const createNewWorkspace = useCallback(
    async (name?: string) => {
      const ws = await fetchApi<WorkspaceInfo>("/api/v1/auth/workspace/new", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await switchWorkspace(ws.id);
      return ws;
    },
    [switchWorkspace],
  );

  const setSelectedModel = useCallback((model: AIModelCode | null) => {
    setSelectedModelState(model);
    store(MODEL_KEY, model);
  }, []);

  const setSelectedLanguage = useCallback((lang: LanguageCode) => {
    setSelectedLanguageState(lang);
    store(LANG_KEY, lang);
  }, []);

  const value = useMemo<SessionContextType>(
    () => ({
      session,
      status,
      isLoading: status === "loading",
      activeWorkspaceId: session?.workspace_id ?? "",
      workspaces,
      selectedModel,
      selectedLanguage,
      signIn,
      signOut,
      createNewWorkspace,
      switchWorkspace,
      refreshWorkspaces,
      setSelectedModel,
      setSelectedLanguage,
    }),
    [session, status, workspaces, selectedModel, selectedLanguage, signIn, signOut, createNewWorkspace, switchWorkspace, refreshWorkspaces, setSelectedModel, setSelectedLanguage],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
