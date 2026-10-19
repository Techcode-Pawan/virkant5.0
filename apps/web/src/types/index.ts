export type UserRole =
  | 'viewer'
  | 'operator'
  | 'engineer'
  | 'knowledge_manager'
  | 'org_admin'
  | 'platform_admin';

export type LanguageCode = 'en' | 'hi';

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
  created_at: string;
}

export interface Machine {
  id: string;
  organization_id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  plant_location?: string;
  document_count?: number;
  active_issues?: number;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  organization_id: string;
  machine_id?: string | null;
  title: string;
  file_name: string;
  file_key: string;
  mime_type: string;
  file_size_bytes: number;
  version: string;
  status: DocumentStatus;
  page_count: number;
  error_message?: string | null;
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
