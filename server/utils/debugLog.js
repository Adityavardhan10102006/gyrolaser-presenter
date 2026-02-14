const path = require('path');
const fs = require('fs');

// Prefer .cursor/debug.log (session path); fallback to project-root debug.log for reliable capture
const CURSOR_LOG = path.resolve(__dirname, '..', '..', '.cursor', 'debug.log');
const FALLBACK_LOG = path.resolve(process.cwd(), 'debug.log');
const LOG_PATH = CURSOR_LOG;

function log(payload) {
  const line = JSON.stringify(payload) + '\n';
  try {
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_PATH, line);
  } catch (e) {}
  try {
    fs.appendFileSync(FALLBACK_LOG, line);
  } catch (e2) {}
}

module.exports = { log, LOG_PATH };
