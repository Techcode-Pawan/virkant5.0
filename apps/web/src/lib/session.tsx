"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserSession, WorkspaceInfo, AIModelCode, LanguageCode, UserRole } from "@/types";
import { fetchApi } from "./api-client";

interface SessionContextType {
  session: UserSession | null;
  activeWorkspaceId: string;
  selectedModel: AIModelCode;
  selectedLanguage: LanguageCode;
  workspaces: WorkspaceInfo[];
  isLoading: boolean;
  signIn: (email: string, role: UserRole, preferredLanguage?: LanguageCode, newWorkspace?: boolean) => Promise<UserSession>;
  createNewWorkspace: (name?: string) => Promise<WorkspaceInfo>;
  switchWorkspace: (workspaceId: string) => void;
  setSelectedModel: (model: AIModelCode) => void;
  setSelectedLanguage: (lang: LanguageCode) => void;
  refreshWorkspaces: () => Promise<void>;
  signOut: () => void;
}

const DEFAULT_SESSION: UserSession = {
  token: "mock-operator:a1111111:c1a2b3c4:ws-a1111111:sess-default",
  session_id: "sess-default",
  user_id: "a1111111-1111-1111-1111-111111111111",
  email: "operator.rajesh@vikrant.internal",
  full_name: "Rajesh Sharma",
  role: "operator",
  organization_id: "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
  organization_name: "Vikrant Heavy Forge Industries",
  workspace_id: "ws-a1111111",
  workspace_name: "Operator Rajesh Bay C-4",
  preferred_language: "hi",
  selected_model: "gemini-2.5-flash",
  created_at: new Date().toISOString(),
};

const SessionContext = createContext<SessionContextType>({
  session: DEFAULT_SESSION,
  activeWorkspaceId: "ws-a1111111",
  selectedModel: "gemini-2.5-flash",
  selectedLanguage: "en",
  workspaces: [],
  isLoading: false,
  signIn: async () => DEFAULT_SESSION,
  createNewWorkspace: async () => ({ id: "", name: "", user_id: "", document_count: 0, is_active: true, created_at: "" }),
  switchWorkspace: () => {},
  setSelectedModel: () => {},
  setSelectedLanguage: () => {},
  refreshWorkspaces: async () => {},
  signOut: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(DEFAULT_SESSION);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("ws-a1111111");
  const [selectedModel, setSelectedModelState] = useState<AIModelCode>("gemini-2.5-flash");
  const [selectedLanguage, setSelectedLanguageState] = useState<LanguageCode>("en");
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage or fetch profile
  useEffect(() => {
    async function initSession() {
      if (typeof window !== "undefined") {
        const storedToken = localStorage.getItem("forgewise_auth_token");
        const storedWs = localStorage.getItem("forgewise_active_workspace");
        const storedModel = localStorage.getItem("forgewise_selected_model") as AIModelCode | null;
        const storedRole = (localStorage.getItem("forgewise_user_role") || "operator") as UserRole;
        const storedEmail = localStorage.getItem("forgewise_user_email") || "operator.rajesh@vikrant.internal";

        if (storedModel) setSelectedModelState(storedModel);
        if (storedWs) setActiveWorkspaceId(storedWs);

        if (storedToken) {
          try {
            const profile = await fetchApi<any>("/api/v1/auth/me");
            const wsId = storedWs || profile.workspace_id || "ws-a1111111";
            setActiveWorkspaceId(wsId);
            setSession({
              token: storedToken,
              session_id: profile.session_id || "sess-init",
              user_id: profile.user_id,
              email: profile.email || storedEmail,
              full_name: profile.full_name || storedEmail.split("@")[0].replace(".", " "),
              role: profile.role || storedRole,
              organization_id: profile.organization_id,
              organization_name: profile.organization_name || "Vikrant Heavy Forge Industries",
              workspace_id: wsId,
              workspace_name: `Isolated Workspace (${(profile.role || storedRole).toUpperCase()})`,
              preferred_language: profile.preferred_language || "en",
              selected_model: storedModel || "gemini-2.5-flash",
              created_at: new Date().toISOString(),
            });
          } catch {
            // Offline or default fallback
            setSession(DEFAULT_SESSION);
          }
        } else {
          setSession(DEFAULT_SESSION);
        }
      }
      setIsLoading(false);
    }
    initSession();
  }, []);

  const refreshWorkspaces = async () => {
    try {
      const data = await fetchApi<WorkspaceInfo[]>("/api/v1/auth/workspaces");
      setWorkspaces(data);
    } catch {
      setWorkspaces([
        {
          id: activeWorkspaceId,
          name: `Workspace ${activeWorkspaceId}`,
          user_id: session?.user_id || "user-1",
          document_count: 3,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  useEffect(() => {
    if (session?.token) {
      refreshWorkspaces();
    }
  }, [session?.token, activeWorkspaceId]);

  const signIn = async (
    email: string,
    role: UserRole,
    preferredLanguage: LanguageCode = "en",
    newWorkspace: boolean = true
  ): Promise<UserSession> => {
    setIsLoading(true);
    try {
      const response = await fetchApi<any>("/api/v1/auth/session", {
        method: "POST",
        body: JSON.stringify({
          email,
          role,
          preferred_language: preferredLanguage,
          new_workspace: newWorkspace,
        }),
      });

      const newSession: UserSession = {
        token: response.token,
        session_id: response.session_id,
        user_id: response.user_id,
        email: response.email,
        full_name: response.full_name,
        role: response.role,
        organization_id: response.organization_id,
        organization_name: response.organization_name,
        workspace_id: response.workspace_id,
        workspace_name: response.workspace_name,
        preferred_language: response.preferred_language || preferredLanguage,
        selected_model: selectedModel,
        created_at: response.created_at,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("forgewise_auth_token", response.token);
        localStorage.setItem("forgewise_user_role", response.role);
        localStorage.setItem("forgewise_user_email", response.email);
        localStorage.setItem("forgewise_active_workspace", response.workspace_id);
      }

      setSession(newSession);
      setActiveWorkspaceId(response.workspace_id);
      await refreshWorkspaces();
      setIsLoading(false);
      return newSession;
    } catch (err) {
      console.error("Sign-in session generation failed:", err);
      // Fallback local mock session
      const wsId = `ws-${Math.random().toString(36).substring(2, 10)}`;
      const fallbackToken = `mock-${role}:${email}:c1a2b3c4:${wsId}:sess-local`;
      const fallbackSession: UserSession = {
        token: fallbackToken,
        session_id: "sess-local",
        user_id: `usr-${email.split("@")[0]}`,
        email,
        full_name: email.split("@")[0].replace(".", " "),
        role,
        organization_id: "c1a2b3c4-d5e6-7f80-9a0b-1c2d3e4f5a6b",
        organization_name: "Vikrant Heavy Forge Industries",
        workspace_id: wsId,
        workspace_name: `${email.split("@")[0]}'s Workspace`,
        preferred_language: preferredLanguage,
        selected_model: selectedModel,
        created_at: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("forgewise_auth_token", fallbackToken);
        localStorage.setItem("forgewise_user_role", role);
        localStorage.setItem("forgewise_user_email", email);
        localStorage.setItem("forgewise_active_workspace", wsId);
      }

      setSession(fallbackSession);
      setActiveWorkspaceId(wsId);
      setIsLoading(false);
      return fallbackSession;
    }
  };

  const createNewWorkspace = async (name?: string): Promise<WorkspaceInfo> => {
    try {
      const newWs = await fetchApi<WorkspaceInfo>("/api/v1/auth/workspace/new", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      switchWorkspace(newWs.id);
      await refreshWorkspaces();
      return newWs;
    } catch {
      const generatedId = `ws-${Math.random().toString(36).substring(2, 10)}`;
      const fallbackWs: WorkspaceInfo = {
        id: generatedId,
        name: name || `Clean Workspace ${generatedId}`,
        user_id: session?.user_id || "user",
        document_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      switchWorkspace(generatedId);
      setWorkspaces((prev) => [fallbackWs, ...prev]);
      return fallbackWs;
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    if (typeof window !== "undefined") {
      localStorage.setItem("forgewise_active_workspace", workspaceId);
      if (session) {
        // Update auth token with new workspace_id
        const parts = session.token.split(":");
        if (parts.length >= 3) {
          const newToken = `mock-${session.role}:${session.user_id}:${session.organization_id}:${workspaceId}:${session.session_id}`;
          localStorage.setItem("forgewise_auth_token", newToken);
          setSession((prev) => (prev ? { ...prev, workspace_id: workspaceId, token: newToken } : null));
        }
      }
    }
  };

  const setSelectedModel = (model: AIModelCode) => {
    setSelectedModelState(model);
    if (typeof window !== "undefined") {
      localStorage.setItem("forgewise_selected_model", model);
    }
    setSession((prev) => (prev ? { ...prev, selected_model: model } : null));
  };

  const setSelectedLanguage = (lang: LanguageCode) => {
    setSelectedLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("forgewise_lang", lang);
    }
    setSession((prev) => (prev ? { ...prev, preferred_language: lang } : null));
  };

  const signOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("forgewise_auth_token");
      localStorage.removeItem("forgewise_active_workspace");
    }
    setSession(null);
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        activeWorkspaceId,
        selectedModel,
        selectedLanguage,
        workspaces,
        isLoading,
        signIn,
        createNewWorkspace,
        switchWorkspace,
        setSelectedModel,
        setSelectedLanguage,
        refreshWorkspaces,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
