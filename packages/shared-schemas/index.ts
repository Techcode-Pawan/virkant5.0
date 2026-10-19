/**
 * @forgewise/shared-schemas
 * Validation schemas for forms and API payloads
 */

export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg'];
export const MAX_UPLOAD_BYTES = 52428800; // 50MB

export const CHAT_QUERY_SCHEMA = {
  minLength: 2,
  maxLength: 1000,
};

export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const;
export const SUPPORTED_ROLES = ['viewer', 'operator', 'engineer', 'knowledge_manager', 'org_admin', 'platform_admin'] as const;
