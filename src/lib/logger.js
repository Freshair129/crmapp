/**
 * Structured Logger (Phase 4)
 * Zero-dependency JSON logger for Node.js ESM.
 *
 * Production: one-line JSON to stdout/stderr
 * Development: colorized pretty-print
 *
 * Usage:
 *   import { logger } from './logger.js'
 *   logger.info('line-webhook', 'Attribution OK', { customerId, adId })
 *   logger.error('cron', 'Job failed', err, { jobName: 'fatigue-check' })
 */

const IS_PROD = process.env.NODE_ENV === 'production';

// ANSI colors (dev only)
const C = {
  reset: '\x1b[0m',
  gray:  '\x1b[90m',
  cyan:  '\x1b[36m',
  yellow:'\x1b[33m',
  red:   '\x1b[31m',
  bold:  '\x1b[1m',
};

const LEVEL_COLOR = {
  INFO:  C.cyan,
  WARN:  C.yellow,
  ERROR: C.red,
};

/**
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} module
 * @param {string} message
 * @param {Error|null} error
 * @param {object} meta
 */
function write(level, module, message, error = null, meta = {}) {
  const timestamp = new Date().toISOString();

  if (IS_PROD) {
    const entry = {
      timestamp,
      level,
      module,
      message,
      ...meta,
    };
    if (error instanceof Error) {
      entry.error = { name: error.name, message: error.message };
    }
    const out = level === 'ERROR' ? process.stderr : process.stdout;
    out.write(JSON.stringify(entry) + '\n');
  } else {
    const color = LEVEL_COLOR[level] ?? C.reset;
    const tag   = `${color}${C.bold}[${level.padEnd(5)}]${C.reset}`;
    const mod   = `${C.gray}${module.padEnd(16)}${C.reset}`;
    let line    = `${tag} ${mod} ${message}`;
    if (Object.keys(meta).length) {
      line += ` ${C.gray}${JSON.stringify(meta)}${C.reset}`;
    }
    if (error instanceof Error) {
      line += `\n${C.red}${error.stack ?? error.message}${C.reset}`;
    }
    const out = level === 'ERROR' ? process.stderr : process.stdout;
    out.write(line + '\n');
  }
}

export const logger = {
  /** @param {string} module @param {string} message @param {object} [meta] */
  info:  (module, message, meta = {}) => write('INFO',  module, message, null, meta),

  /** @param {string} module @param {string} message @param {object} [meta] */
  warn:  (module, message, meta = {}) => write('WARN',  module, message, null, meta),

  /** @param {string} module @param {string} message @param {Error} [error] @param {object} [meta] */
  error: (module, message, error = null, meta = {}) => write('ERROR', module, message, error, meta),
};

export default logger;
