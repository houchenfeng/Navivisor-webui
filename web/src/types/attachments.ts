/** Attachment types for ChatInput rich user input. */

/** A file/image/skill attachment pending in the ChatInput chips area. */
export type ChatAttachment =
  | ChatFileAttachment
  | ChatImageAttachment
  | ChatSkillAttachment;

/**
 * File mention attachment (from @ search, file tree, or paste).
 * Inline in textarea as @displayName; resolved to absolute path on send.
 */
export interface ChatFileAttachment {
  type: 'mention';
  id: string;
  /** Relative path shown in textarea (e.g., "src/main.ts"). */
  displayName: string;
  /** Absolute path for Codex (e.g., "/project/src/main.ts"). */
  path: string;
}

/** Image attachment (from paste/upload, stored via chat/upload endpoint). */
export interface ChatImageAttachment {
  type: 'localImage';
  id: string;
  name: string;
  path: string;
  /** Blob URL for thumbnail preview (revoked on remove). */
  previewUrl?: string;
}

/** Skill attachment (from skill selector). */
export interface ChatSkillAttachment {
  type: 'skill';
  id: string;
  name: string;
  path: string;
}
