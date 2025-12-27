/**
 * Centralized logging utility for Bookiji
 * 
 * Provides environment-aware logging that:
 * - Only logs debug/info in development
 * - Always logs errors and warnings
 * - Supports structured logging
 * - Can be extended for production log aggregation
 */

import { isDevelopment, isProduction } from '@/config/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // In production, only log warnings and errors
    // In development, log everything
    this.logLevel = isProduction() ? LogLevel.WARN : LogLevel.DEBUG;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      if (context) {
        console.debug(`[DEBUG] ${message}`, context);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  }

  /**
   * Log informational messages (development only)
   */
  info(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.INFO) {
      if (context) {
        console.info(`[INFO] ${message}`, context);
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  }

  /**
   * Log warnings (always logged)
   */
  warn(message: string, context?: LogContext): void {
    if (this.logLevel <= LogLevel.WARN) {
      if (context) {
        console.warn(`[WARN] ${message}`, context);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  }

  /**
   * Log errors (always logged)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const errorContext: LogContext = {
        ...context,
        ...(error instanceof Error
          ? {
              error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
              },
            }
          : { error }),
      };

      console.error(`[ERROR] ${message}`, errorContext);
    }
  }

  /**
   * Log with emoji prefix (for backward compatibility during migration)
   * Only logs in development
   */
  log(message: string, ...args: unknown[]): void {
    if (isDevelopment()) {
      console.log(message, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error | unknown, context?: LogContext) =>
  logger.error(message, error, context);
