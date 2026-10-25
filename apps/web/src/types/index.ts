export type UserRole =
  | 'viewer'
  | 'operator'
  | 'engineer'
  | 'knowledge_manager'
  | 'org_admin'
  | 'platform_admin';

export type LanguageCode = 'en' | 'hi' | 'es' | 'de' | 'fr' | 'ja';

/** Model id from GET /api/v1/llm/models (e.g. "gemini-2.5-flash", "ollama/llama3.1:8b"). */
export type AIModelCode = string;

export type ChatMode = 'grounded' | 'general';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type GroundednessStatus = 'supported' | 'insufficient_evidence' | 'general' | 'needs_review';

export interface Citation {
  citation_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  section_title?: string;
  excerpt: string;
  relevance_score?: number;
}

export interface LLMAttempt {
  model_id: string;
  provider: string;
  ok: boolean;
  error_kind?: string | null;
  message?: string | null;
  latency_ms: number;
  retries: number;
  skipped: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  groundedness_status?: GroundednessStatus;
  citations?: Citation[];
  latency_ms?: number;
  model_used?: string;
  provider?: string | null;
  fallback_used?: boolean;
  degraded?: boolean;
  attempts?: LLMAttempt[];
  feedback?: number | null;
  workspace_id?: string;
  created_at: string;
  /** client-only: request failed, can be retried */
  failed?: boolean;
  errorCode?: string;
}

export interface ChatResponse {
  answer: string;
  language: string;
  conversation_id: string;
  request_id: string;
  grounded: boolean;
  confidence_status: GroundednessStatus;
  citations: Citation[];
  model_used: string;
  provider?: string | null;
  fallback_used: boolean;
  degraded: boolean;
  attempts: LLMAttempt[];
  latency_ms: number;
  workspace_id?: string;
  message_id?: string;
  user_message_id?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  machine_id?: string | null;
  language: string;
  mode: ChatMode;
  message_count: number;
  last_model?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: Array<Omit<ChatMessage, 'conversation_id'>>;
}

export type ProviderState = 'not_configured' | 'unverified' | 'ready' | 'degraded' | 'unavailable' | 'error';

export interface ProviderStatus {
  id: string;
  label: string;
  configured: boolean;
  requires_key: boolean;
  state: ProviderState;
  default_model: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_checked_at: string | null;
  last_error_kind: string | null;
  last_error: string | null;
  cooldown_seconds: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  context_window: number;
  available: boolean;
}

export interface Machine {
  id: string;
  name: string;
  organization_id?: string;
  manufacturer?: string;
  model?: string;
  plant_location?: string;
  document_count?: number;
  active_issues?: number;
  status?: string;
  created_at?: string;
}

export interface DocumentItem {
  id: string;
  organization_id: string;
  machine_id?: string | null;
  workspace_id?: string | null;
  title: string;
  file_name: string;
  file_key: string;
  mime_type: string;
  file_size_bytes: number;
  version: string;
  status: DocumentStatus;
  page_count: number;
  chunk_count?: number;
  is_custom?: boolean;
  error_message?: string | null;
  created_at: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  user_id: string;
  document_count: number;
  is_active: boolean;
  created_at: string;
}

export interface UserSession {
  token: string;
  session_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
  workspace_id: string;
  workspace_name: string;
  preferred_language: LanguageCode;
  created_at: string;
}

export interface AnalyticsOverview {
  total_queries_last_30d: number;
  grounded_percentage: number;
  average_retrieval_latency_ms: number;
  unanswered_knowledge_gaps_count: number;
  documents_indexed_count: number;
  active_operators_count: number;
  assistant_answers_last_30d: number;
}

export interface CommonIssueItem {
  machine_id: string;
  machine_name: string;
  topic: string;
  frequency: number;
  resolution_status: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  preferred_language: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  ip_address?: string;
  created_at: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  version: string;
  database: { status: 'connected' | 'disconnected' | 'not_configured'; database?: string; latency_ms?: number | null; error?: string | null };
  llm: { configured_providers: string[]; primary_model: string; offline_fallback: boolean };
}
