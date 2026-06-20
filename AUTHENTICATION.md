# NAFAS Admin Authentication Guide

## Overview
The Admin Panel uses a secure server-side authentication system. Default credentials are provided, but **you must change them immediately**.

## Default Credentials
- **Default Password**: `nafas-admin-2026`
- **Location**: `public/.admin-credentials.json` (created automatically)

## Accessing the Admin Panel

### Step 1: Initial Setup
The first time you try to access the Admin Panel, you'll be prompted for a password.
- Use the default password: `nafas-admin-2026`
- The system will create a session token valid for that session

### Step 2: Change Your Password
**IMPORTANT**: Change the password immediately after first login.

#### Option A: Web Interface (Easiest)
1. Open: `http://your-domain/admin-credentials-manager.php`
2. Enter your new password (minimum 8 characters)
3. Click "ذخیره رمز" (Save Password)

#### Option B: Command Line
```bash
php public/admin-credentials-manager.php set your-new-password
```

#### Option C: Reset to Default
If you forgot your password:
```bash
php public/admin-credentials-manager.php reset
```

Or via web interface, click "بازنشانی" (Reset).

## Security Features

✅ **Password Hashing**: Passwords are hashed with bcrypt (irreversible)  
✅ **Session Tokens**: Each login generates a unique token, not stored permanently  
✅ **CORS Protection**: API validates origin headers  
✅ **File Permissions**: Credential files set to 0600 (owner read/write only)  
✅ **Rate Limiting**: (Optional - can be implemented in `api.php`)  

## Files Created

| File | Purpose |
|------|---------|
| `public/api.php` | Main authentication endpoint |
| `public/admin-credentials-manager.php` | Credential management (web + CLI) |
| `public/.admin-credentials.json` | Hashed password storage (auto-created) |
| `public/.admin-tokens.json` | Active session tokens (auto-created) |

## Troubleshooting

**Q: I get "خطا در اتصال به سرور" (Connection Error)**
- Check that `api.php` is accessible at `http://your-domain/api.php`
- If using a subdirectory, update `VITE_API_BASE_URL` in your `.env`

**Q: "رمز عبور اشتباه است" (Wrong Password)**
- Make sure you're using the correct password
- Reset to default: `php public/admin-credentials-manager.php reset`

**Q: Session keeps expiring**
- Session tokens last 24 hours by default
- Login again to generate a new token

## Production Deployment Checklist

- [ ] Changed default password to something secure
- [ ] Deleted or restricted access to `admin-credentials-manager.php`
- [ ] Set `api.php` and credential files to read-only for production
- [ ] Configured HTTPS for all admin requests
- [ ] Added rate limiting to prevent brute force attacks
- [ ] Enabled HTTPS-only cookies in SessionStorage

## API Endpoint Reference

### POST `/api.php`

**Request Headers:**
```
Content-Type: application/json
X-Admin-Password: your-password
```

**Request Body:**
```json
{
  "action": "validate_token"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "token": "hex-encoded-token",
  "message": "خوش آمدید"
}
```

**Error Response (401):**
```json
{
  "valid": false,
  "error": "رمز عبور اشتباه است"
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│ Admin Panel (React Component)            │
│  - Prompts for password                 │
│  - Sends to /api.php                    │
└──────────────┬──────────────────────────┘
               │ POST /api.php
               ↓
┌──────────────────────────────────────────┐
│ api.php (PHP Backend)                    │
│  1. Load credentials from .json file     │
│  2. Verify password with bcrypt          │
│  3. Generate session token               │
│  4. Return token to client               │
└──────────────┬──────────────────────────┘
               │ Token
               ↓
┌──────────────────────────────────────────┐
│ sessionStorage.admin_token               │
│  - Valid for current session only        │
│  - Sent with subsequent admin requests   │
└──────────────────────────────────────────┘
```

---

**Note**: For questions or issues, check the NAFAS_V4_MASTER_PROMPT.md file for additional implementation details.
