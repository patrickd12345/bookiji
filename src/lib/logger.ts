/**
 * Centralized logging utility
 * 
 * Uses console.warn and console.error which are allowed by ESLint rules.
 * Provides a consistent logging interface across the application.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    
    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`
    }
    
    return `${prefix} ${message}`
  }

  info(message: string, context?: LogContext): void {
    // Use console.warn for info level (allowed by ESLint)
    console.warn(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context))
  }

  debug(message: string, context?: LogContext): void {
    // Use console.warn for debug level (allowed by ESLint)
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.warn(this.formatMessage('debug', message, context))
    }
  }

  log(message: string, context?: LogContext): void {
    // Alias for info to maintain compatibility
    this.info(message, context)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export class for testing
export { Logger }
