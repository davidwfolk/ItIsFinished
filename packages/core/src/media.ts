/**
 * Storage & Media Helpers for Local-First Attachments
 */

export const FREE_TIER_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PRO_TIER_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic'
];

export const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const ALLOWED_AUDIO_MIMES = [
  'audio/mp4',
  'audio/mpeg',
  'audio/m4a',
  'audio/wav'
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  isImage: boolean;
  shouldCompress: boolean;
}

/**
 * Validates a file before upload against tier limits and security policies.
 */
export function validateAttachment(
  fileSize: number,
  mimeType: string,
  isProUser: boolean = false
): FileValidationResult {
  const maxBytes = isProUser ? PRO_TIER_MAX_BYTES : FREE_TIER_MAX_BYTES;
  const isImage = ALLOWED_IMAGE_MIMES.includes(mimeType.toLowerCase());
  const isDoc = ALLOWED_DOC_MIMES.includes(mimeType.toLowerCase());
  const isAudio = ALLOWED_AUDIO_MIMES.includes(mimeType.toLowerCase());

  if (!isImage && !isDoc && !isAudio) {
    return {
      valid: false,
      error: `Unsupported file type (${mimeType}). Allowed: Images, PDFs, Docs, Audio.`,
      isImage: false,
      shouldCompress: false
    };
  }

  // Non-compressed files must strictly stay within byte limits
  if (!isImage && fileSize > maxBytes) {
    const limitMB = maxBytes / (1024 * 1024);
    return {
      valid: false,
      error: `File exceeds maximum size of ${limitMB}MB for ${isProUser ? 'Pro' : 'Free'} tier.`,
      isImage,
      shouldCompress: false
    };
  }

  return {
    valid: true,
    isImage,
    shouldCompress: isImage // Photos are always compressed on client
  };
}

/**
 * Standard image compression settings for client devices
 */
export const IMAGE_COMPRESSION_CONFIG = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.8, // 80% JPEG/WebP quality (reduces 10MB photo to ~350KB)
  format: 'jpeg' as const
};
