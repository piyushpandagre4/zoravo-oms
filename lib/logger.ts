/**
 * Conditional logging utility
 * Only logs in development mode to avoid performance impact and information leakage in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log error messages (always logged, but can be enhanced with error tracking service)
   */
  error: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, you might want to send to error tracking service
      // Example: Sentry.captureException(args[0])
      console.error(...args); // Keep for critical errors, but consider removing in future
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

