export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 30;

/** At least one uppercase, one lowercase, one digit and one special character (@$!%*?&). */
export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

/** Random bytes in a password reset token (hex-encoded in the link). */
export const RESET_TOKEN_BYTES = 32;
export const RESET_TOKEN_TTL_MINUTES = 30;
/** Frontend route that receives the reset link: `${FRONTEND_URL}/reset-password?token=…`. */
export const RESET_PASSWORD_PATH = '/reset-password';
/** Same message for every failure, so the response never tells which check failed. */
export const INVALID_RESET_LINK_MESSAGE = 'Invalid or expired reset link';
