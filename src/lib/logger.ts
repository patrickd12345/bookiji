/**
 * Centralized Logger
 * 
 * Environment-aware logging that:
 * - Suppresses logs in production (except errors)
 * - Provides structured logging
 * - Integrates with monitoring systems
 * - Prevents information leakage
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') {
      return true
    }
    
    // In development, log everything
    if (this.isDevelopment) {
      return true
    }
    
    // In production, only log warnings and errors
    // (errors already handled above, so just check for warn)
    if (this.isProduction) {
      return level === 'warn'
    }
    
    // Default: log everything (staging, test, etc.)
    return true
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return

    const formatted = this.formatMessage(level, message, context)
    
    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        if (error) {
          console.error(formatted, error)
        } else {
          console.error(formatted)
        }
        break
    }

    // In production, send errors to monitoring (Sentry, etc.)
    if (this.isProduction && level === 'error') {
      // TODO: Integrate with Sentry or other monitoring service
      // if (typeof window !== 'undefined' && window.Sentry) {
      //   window.Sentry.captureException(error || new Error(message), { extra: context })
      // }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for dependency injection if needed
export type { Logger, LogLevel, LogContext }

