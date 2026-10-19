/**
 * @forgewise/shared-types
 * Enterprise Industrial Knowledge Platform Core Types
 */

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

export interface UserProfile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  preferred_language: LanguageCode;
  theme_preference: ThemeMode;
  created_at: string;
}

export interface Machine {
  id: string; // e.g., 'CNC-MILL-02'
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

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  language?: LanguageCode;
  machine_id?: string;
  document_scope?: string[];
}

export interface ChatResponse {
  answer: string;
  language: LanguageCode;
  conversation_id: string;
  request_id: string;
  grounded: boolean;
  confidence_status: GroundednessStatus;
  citations: Citation[];
}

export interface AnalyticsOverview {
  total_queries_last_30d: number;
  grounded_percentage: number;
  average_retrieval_latency_ms: number;
  unanswered_knowledge_gaps_count: number;
  documents_indexed_count: number;
  active_operators_count: number;
}
