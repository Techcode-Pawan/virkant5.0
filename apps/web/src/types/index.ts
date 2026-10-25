export type UserRole =
  | 'viewer'
  | 'operator'
  | 'engineer'
  | 'knowledge_manager'
  | 'org_admin'
  | 'platform_admin';

export type LanguageCode = 'en' | 'hi' | 'es' | 'de' | 'fr' | 'ja';

export type AIModelCode =
  | 'gemini-2.5-flash'
  | 'gpt-4o'
  | 'claude-3-5-sonnet'
  | 'ollama-industrial'
  | 'forgewise-expert';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type GroundednessStatus = 'supported' | 'insufficient_evidence' | 'needs_review';

export interface Citation {
  citation_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  section_title?: string;
  excerpt: string;
  relevance_score?: number;
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
  workspace_id?: string;
  created_at: string;
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
  selected_model: AIModelCode;
  created_at: string;
}

export interface AnalyticsOverview {
  total_queries_last_30d: number;
  grounded_percentage: number;
  average_retrieval_latency_ms: number;
  unanswered_knowledge_gaps_count: number;
  documents_indexed_count: number;
  active_operators_count: number;
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
