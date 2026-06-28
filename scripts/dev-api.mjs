/**
 * NAFAS Dev API Server
 * 
 * A Node.js development server that mimics the PHP API backend.
 * Replaces api.php when PHP is not available in the development environment.
 * 
 * Usage: node scripts/dev-api.mjs
 *        (runs on port 3001 by default)
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const CREDENTIALS_FILE = join(PUBLIC_DIR, '.admin-credentials.json');
const TOKENS_FILE = join(PUBLIC_DIR, '.admin-tokens.json');
const CONTENT_FILE = join(PUBLIC_DIR, 'data', 'content.json');

const PORT = parseInt(process.env.DEV_API_PORT || '3001', 10);
const TOKEN_TTL_SECONDS = 86400; // 24 hours

// ─── Logging ──────────────────────────────────────────────────────────────────
function log(method, path, status, body) {
  const ts = new Date().toISOString().slice(11, 19);
  const summary = typeof body === 'object' && body ? JSON.stringify(body).slice(0, 120) : '';
  console.log(`[${ts}] ${method} ${path} → ${status} ${summary}`);
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────
function setCorsHeaders(res, origin) {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password, X-Admin-Token');
  res.setHeader('Access-Control-Max-Age', '3600');
}

// ─── JSON Helpers ─────────────────────────────────────────────────────────────
function jsonResponse(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readJson(path, fallback = null) {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Credentials ──────────────────────────────────────────────────────────────
const DEV_PASSWORD = process.env.DEV_ADMIN_PASSWORD || 'changeme-dev-only';
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEV_PASSWORD, 12);

function ensureCredentials() {
  let creds = readJson(CREDENTIALS_FILE);
  if (!creds || !creds.password) {
    creds = {
      password: DEFAULT_PASSWORD_HASH,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      note: 'Change this password from the admin panel (Settings) when convenient.',
    };
    writeJson(CREDENTIALS_FILE, creds);
  }
  return creds;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
function loadTokens() {
  return readJson(TOKENS_FILE, {});
}

function pruneTokens(tokens) {
  const now = Math.floor(Date.now() / 1000);
  const pruned = {};
  for (const [token, data] of Object.entries(tokens)) {
    if (data && data.created_at && (now - data.created_at) < TOKEN_TTL_SECONDS) {
      pruned[token] = data;
    }
  }
  return pruned;
}

function saveTokens(tokens) {
  writeJson(TOKENS_FILE, tokens);
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

function isValidToken(submittedToken) {
  if (!submittedToken) return false;
  const tokens = pruneTokens(loadTokens());
  saveTokens(tokens);
  return tokens[submittedToken] !== undefined;
}

// ─── Request Handlers ─────────────────────────────────────────────────────────
function handleLogin(reqBody, headers, res) {
  const credentials = ensureCredentials();
  const submittedPassword = headers['x-admin-password'] || reqBody?.password || '';

  if (!submittedPassword) {
    return jsonResponse(res, 400, { error: 'Password is required', valid: false });
  }

  if (!bcrypt.compareSync(submittedPassword, credentials.password)) {
    return jsonResponse(res, 401, { error: 'Invalid password', valid: false });
  }

  const token = generateToken();
  const tokens = loadTokens();
  tokens[token] = {
    created_at: Math.floor(Date.now() / 1000),
    ip: reqBody?._ip || '127.0.0.1',
    user_agent: headers['user-agent'] || 'unknown',
  };
  saveTokens(pruneTokens(tokens));

  jsonResponse(res, 200, { valid: true, token, message: 'Welcome' });
}

function handleChangePassword(reqBody, headers, res) {
  const token = headers['x-admin-token'] || '';
  if (!isValidToken(token)) {
    return jsonResponse(res, 401, { success: false, error: 'Invalid or expired admin token' });
  }

  const current = reqBody?.current_password || '';
  const newPwd = reqBody?.new_password || '';
  const credentials = ensureCredentials();

  if (!bcrypt.compareSync(current, credentials.password)) {
    return jsonResponse(res, 401, { success: false, error: 'رمز فعلی نادرست است.' });
  }

  if (newPwd.length < 8) {
    return jsonResponse(res, 400, { success: false, error: 'رمز جدید باید حداقل ۸ کاراکتر باشد.' });
  }

  credentials.password = bcrypt.hashSync(newPwd, 12);
  credentials.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  delete credentials.note;
  writeJson(CREDENTIALS_FILE, credentials);

  // Keep only the current token
  saveTokens({
    [token]: {
      created_at: Math.floor(Date.now() / 1000),
      ip: '127.0.0.1',
      user_agent: headers['user-agent'] || 'unknown',
    },
  });

  jsonResponse(res, 200, { success: true, message: 'رمز عبور با موفقیت تغییر کرد.' });
}

function handleSaveData(reqBody, headers, res) {
  const token = headers['x-admin-token'] || '';
  if (!isValidToken(token)) {
    return jsonResponse(res, 401, { success: false, error: 'Invalid or expired admin token' });
  }

  const catalogs = reqBody?.catalogs;
  const videos = reqBody?.videos;
  const banners = reqBody?.banners || [];

  if (!Array.isArray(catalogs) || !Array.isArray(videos) || !Array.isArray(banners)) {
    return jsonResponse(res, 400, { success: false, error: 'Invalid data payload' });
  }

  for (const catalog of catalogs) {
    if (!catalog || !catalog.id || !catalog.title || !Array.isArray(catalog.pages)) {
      return jsonResponse(res, 400, { success: false, error: 'Invalid catalog payload' });
    }
  }

  const payload = {
    catalogs: Object.values(catalogs),
    videos: Object.values(videos),
    banners: Object.values(banners),
    updated_at: new Date().toISOString(),
  };

  writeJson(CONTENT_FILE, payload);
  jsonResponse(res, 200, { success: true, message: 'Data saved' });
}

function handleGetContent(res) {
  const content = readJson(CONTENT_FILE);
  if (!content) {
    return jsonResponse(res, 404, { error: 'No server content saved' });
  }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(content));
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  const { method, url, headers } = req;
  const origin = headers['origin'] || '';
  setCorsHeaders(res, origin);

  // Handle preflight
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return log('OPTIONS', url, 200);
  }

  // Only handle /api.php
  const urlPath = new URL(url, 'http://localhost').pathname;
  if (!urlPath.endsWith('/api.php') && !urlPath.endsWith('/api.php/')) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return log(method, url, 404);
  }

  // GET - return saved content
  if (method === 'GET') {
    handleGetContent(res);
    return log('GET', url, 200);
  }

  // POST - handle actions
  if (method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      let parsed = {};
      try {
        parsed = JSON.parse(body);
      } catch {}

      const action = parsed?.action || (parsed?.password ? 'login' : '');

      switch (action) {
        case 'save_data':
          handleSaveData(parsed, headers, res);
          return log('POST', url, 200, { action: 'save_data' });
        case 'change_password':
          handleChangePassword(parsed, headers, res);
          return log('POST', url, 200, { action: 'change_password' });
        case 'login':
        case 'validate_token':
        case '':
          handleLogin(parsed, headers, res);
          return log('POST', url, 200, { action: 'login' });
        default:
          jsonResponse(res, 400, { error: 'Unknown action', valid: false });
          return log('POST', url, 400, { action });
      }
    });
    return;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
  log(method, url, 405);
});

server.listen(PORT, () => {
  console.log(`\n  🔐 NAFAS Dev API Server running on http://localhost:${PORT}`);
  console.log(`  📁 Credentials: ${CREDENTIALS_FILE}`);
  console.log(`  🗝  Set DEV_ADMIN_PASSWORD env var to choose the dev password.\n`);
});