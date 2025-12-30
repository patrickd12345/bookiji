/* eslint-disable no-console */
/**
 * Centralized Logger
 *
 * Environment-aware logging utility that:
 * - Suppresses debug/info logs in production
 * - Always logs warnings and errors
 * - Provides structured logging with context
 * - Ready for future integration with monitoring (Sentry, etc.)
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
    this.isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'prod'
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') return true
    
    // In development, log everything
    if (this.isDevelopment) return true
    
    // In production, only log warnings and errors
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

    const formattedMessage = this.formatMessage(level, message, context)
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage, error ? error.stack : '')
        break
      case 'error':
        console.error(formattedMessage, error ? error.stack : '')
        break
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

export const logger = new Logger()
export type { Logger, LogLevel, LogContext }

