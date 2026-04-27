/**
 * Builder error sanitization utilities.
 * Maps raw error strings from the Go builder to user-friendly, translatable messages.
 *
 * Error patterns are based on the builder's error classification system
 * (webby-builder/internal/models/errors.go). Errors arrive as plain text
 * in the format "anthropic error: ..." or "openai error: ..." wrapping
 * the upstream API error.
 *
 * IMPORTANT: Each `message` string below doubles as the i18n translation key
 * in lang/{locale}/chat.json. If you change a message here, you MUST update
 * the corresponding key in ALL locale chat.json files, or translations will
 * silently fall back to the English key.
 */

interface ErrorPattern {
    /** Regex to test against the raw error string */
    pattern: RegExp;
    /** User-friendly message (also serves as the i18n translation key) */
    message: string;
}

// Order matters: more specific patterns first to avoid false matches
const ERROR_PATTERNS: ErrorPattern[] = [
    // Rate limit (429)
    {
        pattern: /\b429\b|rate limit|too many requests|limit exhausted/i,
        message: 'The AI service is currently rate limited. Please wait a moment and try again.',
    },
    // Authentication / API key errors (401, 403)
    {
        pattern: /\b401\b|unauthorized|\b403\b|forbidden|invalid.?api.?key|invalid_api_key/i,
        message: 'There was an authentication issue with the AI service. Please contact support if this persists.',
    },
    // Model not found
    {
        pattern: /model not found|does not exist/i,
        message: 'The AI model is not available. Please contact support.',
    },
    // Context / token limit
    {
        pattern: /context length|maximum context|token limit|input too long|prompt too long|max tokens/i,
        message: 'The conversation has become too long for the AI to process. Try starting a new conversation.',
    },
    // Content filter / safety
    {
        pattern: /content.?filter|safety|moderation|blocked|flagged/i,
        message: 'Your request was flagged by the content filter. Please rephrase your message and try again.',
    },
    // Connection errors
    {
        pattern: /connection reset|connection refused|\beof\b|broken pipe/i,
        message: 'Lost connection to the AI service. Please try again.',
    },
    // Timeout
    {
        pattern: /timeout|timed out/i,
        message: 'The AI service took too long to respond. Please try again.',
    },
    // Server errors (500-504)
    {
        pattern: /\b50[0-4]\b|internal server error|bad gateway|service unavailable|gateway timeout/i,
        message: 'The AI service is temporarily unavailable. Please try again in a few moments.',
    },
    // Overloaded / capacity
    {
        pattern: /overloaded|capacity/i,
        message: 'The AI service is experiencing high demand. Please try again shortly.',
    },
    // Bad request (400)
    {
        pattern: /\b400\b|bad request/i,
        message: 'The request could not be processed. Please try again.',
    },
    // Build credits exhausted
    {
        pattern: /\bcredits?\b.*(?:exhausted|depleted|exceeded|insufficient|run\s*out|remaining|reset)|no\s+credits?\b|\bcredit\s+balance\b/i,
        message: "You've run out of build credits. Please upgrade your plan or wait for your credits to reset.",
    },
    // No builders available
    {
        pattern: /no.*builders?.*available/i,
        message: 'No build servers are currently available. Please try again later.',
    },
    // Active session conflict
    {
        pattern: /active.*session|concurrent.*build/i,
        message: 'You already have an active build session. Please wait for it to complete.',
    },
];

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Sanitizes a raw builder error string into a user-friendly, translatable message.
 * Logs the original raw error to console for debugging.
 *
 * @param rawError - The raw error string from the builder
 * @param t - Translation function from LanguageContext
 * @returns A user-friendly error message (translated if available)
 */
export function sanitizeBuilderError(
    rawError: string,
    t: (key: string) => string
): string {
    // Defensive guard: ensure rawError is a string (WebSocket payloads are untyped at runtime)
    const errorString = typeof rawError === 'string' ? rawError : String(rawError ?? '');

    // Log raw error for debugging
    console.error('[Builder Error]', errorString);

    for (const { pattern, message } of ERROR_PATTERNS) {
        if (pattern.test(errorString)) {
            return t(message);
        }
    }

    return t(FALLBACK_MESSAGE);
}
