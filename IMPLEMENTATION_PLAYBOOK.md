# 🛠️ Implementation Playbook — Nafas Pharmed Patient Portal

> This playbook turns the production-readiness audit into an executable, phase-by-phase
> guide for an AI developer. **Do not re-analyze the repository.** Implement the phases
> in order. Each phase is self-contained: you can complete it without reading later phases.
>
> **Golden rules while implementing:**
> - Make the smallest change that satisfies the task. Do not rewrite unrelated code.
> - After each phase, run the phase's Validation Checklist before moving on.
> - In React, **never** assign to a property of an object that is stored in state
>   (e.g. `someStateArray[0].foo = x`). Always build a **new** object/array instead.
> - Keep all Persian (Farsi) UI strings exactly as written unless a task says to change them.
> - The app is RTL (`dir="rtl"`). Do not change layout direction.
>
> **How to run the app locally (for validation):**
> - Install: `npm install`
> - Dev (frontend + mock API): `npm run dev` (frontend on `http://localhost:5173`, mock API on `:3001`)
> - Type-check (after Phase 7 adds it): `npm run typecheck`
> - Production build: `npm run build`

---

## Phase 1 – Critical Security

### Goal
Remove every hardcoded admin password from the client and source tree, stop shipping a
known default credential, and harden the Content-Security-Policy. After this phase the
admin password must exist **only** as a bcrypt hash on the server, never in JavaScript or
in committed files.

### Files to modify
- `src/components/AdminLogin.tsx`
- `hash.js` (delete)
- `workspace/hash.js` (delete)
- `workspace/hash.cjs` (delete)
- `scripts/dev-api.mjs`
- `public/api.php`
- `public/admin-credentials-manager.php`
- `public/.htaccess`

### Exact issues covered
- SEC-01 — Plaintext admin password hardcoded in client bundle.
- SEC-02 — Known default admin bcrypt hash committed in source.
- SEC-03 — CSP allows `'unsafe-inline'` scripts; headers only via `.htaccess`.

### Step-by-step implementation tasks

**Task 1.1 — Remove the client-side password bypass (SEC-01).**
1. Open `src/components/AdminLogin.tsx`.
2. Find the function `validateAdminPassword`. It currently begins with a block like:
   ```ts
   if (pwd === 'Saeed@79170%') {
      sessionStorage.setItem('admin_token', 'local-dev-token');
      onLogin();
      return;
   }
   ```
   **Delete this entire `if` block.**
3. Still inside `validateAdminPassword`, find the `catch (err)` block. It contains a second
   copy of the same bypass:
   ```ts
   if (pwd === 'Saeed@79170%') {
      sessionStorage.setItem('admin_token', 'local-dev-token');
      onLogin();
   } else {
      setError('رمز عبور اشتباه است یا خطا در اتصال به سرور');
   }
   ```
   **Replace the whole `if/else` with just:**
   ```ts
   setError('رمز عبور اشتباه است یا خطا در اتصال به سرور');
   ```
4. Confirm the remaining logic only authenticates via the server `fetch(... './api.php' ...)`
   call and reads `data.valid` / `data.token` from the JSON response. Do not change that part.

**Task 1.2 — Delete one-off hashing scripts that contain the live password (SEC-01).**
1. Delete these three files entirely:
   - `hash.js`
   - `workspace/hash.js`
   - `workspace/hash.cjs`
2. If the `workspace/` directory becomes empty, leave it (do not create new files).

**Task 1.3 — Remove the hardcoded password from the dev API server (SEC-01).**
1. Open `scripts/dev-api.mjs`.
2. Find the line:
   ```js
   const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Saeed@79170%', 12);
   ```
   Replace the string literal with an environment variable and a clearly-fake fallback used
   only for local dev:
   ```js
   const DEV_PASSWORD = process.env.DEV_ADMIN_PASSWORD || 'changeme-dev-only';
   const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEV_PASSWORD, 12);
   ```
3. Find the `server.listen(...)` callback near the bottom that logs:
   ```js
   console.log(`  🗝  Default password: Saeed@79170%\n`);
   ```
   Replace that line with a line that does **not** print any password:
   ```js
   console.log(`  🗝  Set DEV_ADMIN_PASSWORD env var to choose the dev password.\n`);
   ```

**Task 1.4 — Stop shipping a known default credential on the PHP backend (SEC-02).**
1. Open `public/api.php`.
2. Find the function `ensure_credentials(string $credentials_file)`. It currently writes a
   hardcoded hash (`'$2y$10$PADjoIOS3UWVPVmv85GwZOA6nPYYYYdLhd9qUJIfDviBm9Smka4r.'`) into the
   credentials file when none exists.
3. Replace the hardcoded default with a hash read from an environment variable. Edit the
   `if (!file_exists($credentials_file)) { ... }` block so it reads:
   ```php
   if (!file_exists($credentials_file)) {
       $provided_hash = getenv('NAFAS_ADMIN_PASSWORD_HASH') ?: '';
       if ($provided_hash === '') {
           // Refuse to auto-create a known-password account.
           http_response_code(503);
           exit(json_encode(['error' => 'Admin not configured', 'valid' => false]));
       }
       $default_credentials = [
           'password'   => $provided_hash,
           'created_at' => date('Y-m-d H:i:s'),
           'note'       => 'Initialized from NAFAS_ADMIN_PASSWORD_HASH.'
       ];
       file_put_contents($credentials_file, json_encode($default_credentials, JSON_PRETTY_PRINT));
       chmod($credentials_file, 0600);
   }
   ```
4. Open `public/admin-credentials-manager.php`. Find the two functions
   `reset_credentials()` and `reset_credentials_web()`. Both restore the hardcoded hash
   `'$2y$10$PADjoIOS3UWVPVmv85GwZOA6nPYYYYdLhd9qUJIfDviBm9Smka4r.'`.
   - In `reset_credentials()` (CLI), replace the body so it **deletes** the credentials file
     instead of writing the known hash:
     ```php
     function reset_credentials() {
         if (file_exists(CREDENTIALS_FILE)) {
             unlink(CREDENTIALS_FILE);
         }
         echo "✓ Credentials cleared. Reconfigure with NAFAS_ADMIN_PASSWORD_HASH.\n";
     }
     ```
     (Note: use the constant `CREDENTIALS_FILE` directly — see Phase 2, Task 2.1, which fixes
     this file's broken `global` usage. If you are doing Phase 1 strictly before Phase 2,
     it is acceptable to leave the `global $CREDENTIALS_FILE;` line for now; Phase 2 corrects it.)
   - `reset_credentials_web()` will be removed entirely in Phase 2 (Task 2.1). For Phase 1 you
     may leave it; just make sure it no longer references the hardcoded hash by applying the same
     `unlink` change, or leave it for deletion in Phase 2.

**Task 1.5 — Harden the Content-Security-Policy (SEC-03).**
1. Open `public/.htaccess`.
2. Find the `Header always set Content-Security-Policy "..."` block.
3. In the `script-src` directive, **remove** `'unsafe-inline'`. Change:
   ```
   script-src 'self' 'unsafe-inline';
   ```
   to:
   ```
   script-src 'self';
   ```
   **Do not** remove `'unsafe-inline'` from `style-src` — Tailwind and inline `style=` attributes
   require it; leave `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;` as-is.
4. Add an HSTS header. Below the existing `Header always set X-Content-Type-Options ...` line, add:
   ```
   Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
   ```

### Things to be careful about
- After Task 1.1 there must be **no** path in `AdminLogin.tsx` that calls `onLogin()` without a
  successful server response. Search the file for `local-dev-token` and `Saeed` to be sure both
  are gone.
- The known password is already in git history. This playbook removes it from the working tree;
  separately, an operator must **rotate the production password** (change it via the admin panel’s
  “تغییر رمز عبور” form, which already works) because the old one is compromised.
- Removing `'unsafe-inline'` from `script-src` is safe here because Vite emits external script
  files. If the app fails to load with CSP errors in the browser console, confirm no inline
  `<script>` was added to `index.html`.

### Expected result
The admin password exists only as a server-side bcrypt hash. The client bundle, dev server logs,
and source tree contain no plaintext password. Fresh deploys refuse login until configured. CSP no
longer permits inline scripts.

### ✅ Phase 1 Validation Checklist
- [ ] `grep -rn "Saeed@79170" .` (excluding `.git`) returns **nothing**.
- [ ] `grep -rn "local-dev-token" src` returns **nothing**.
- [ ] `hash.js`, `workspace/hash.js`, `workspace/hash.cjs` no longer exist.
- [ ] `AdminLogin.tsx` calls `onLogin()` only after `data.valid === true` from the server.
- [ ] `public/.htaccess` `script-src` is `'self'` (no `'unsafe-inline'`); `style-src` still has `'unsafe-inline'`.
- [ ] `public/.htaccess` contains a `Strict-Transport-Security` header.
- [ ] App still builds: `npm run build` succeeds.

---

## Phase 2 – Backend & API

### Goal
Fix the broken/dangerous PHP credential manager, stop the public content endpoint from being rate-limited
into a denial of service, validate data URLs on the server, move secret state files out of the web root,
and reduce token-store writes.

### Files to modify
- `public/admin-credentials-manager.php`
- `public/api.php`
- `scripts/dev-api.mjs`
- `public/.htaccess`

### Exact issues covered
- SEC-04 — Credential manager broken (`global` vs `const`) and unreachable unauthenticated POST code.
- SEC-05 — Admin/data URLs not validated server-side (and client-side; client part is in this phase too).
- API-01 — Per-IP daily cap of 300 throttles the public content GET.
- SEC-07 — `is_valid_token` rewrites the token file on every request.
- SEC-09 — Credential/token/content files live in the public web root.

### Step-by-step implementation tasks

**Task 2.1 — Fix `admin-credentials-manager.php` and make it CLI-only (SEC-04).**
1. Open `public/admin-credentials-manager.php`.
2. The file declares constants at the top:
   ```php
   const CREDENTIALS_FILE = __DIR__ . '/.admin-credentials.json';
   const TOKENS_FILE = __DIR__ . '/.admin-tokens.json';
   ```
   These are **constants**, not variables. Inside every function that uses them you will see
   `global $CREDENTIALS_FILE;` (or `$TOKENS_FILE`). A `global` statement cannot reference a
   constant, so `$CREDENTIALS_FILE` is `null` and the functions silently fail.
   **In every function**, delete the `global $CREDENTIALS_FILE;` / `global $TOKENS_FILE;` lines,
   and replace each use of the variable `$CREDENTIALS_FILE` with the constant `CREDENTIALS_FILE`
   and `$TOKENS_FILE` with `TOKENS_FILE`. Functions affected: `set_password`, `set_password_web`,
   `show_credentials`, `reset_credentials`, `reset_credentials_web`, `clear_tokens`,
   `clear_tokens_web`, `get_info_web`.
3. Delete the web interface entirely (this file must be CLI-only):
   - Delete the function `display_web_interface()` (the large HTML block).
   - Delete the block `if ($_SERVER['REQUEST_METHOD'] === 'POST') { ... }` and everything inside it
     (the `set_password_web`, `reset_credentials_web`, `clear_tokens_web`, `get_info_web` dispatch).
   - Delete the now-unused `*_web` functions: `set_password_web`, `reset_credentials_web`,
     `clear_tokens_web`, `get_info_web`.
4. Keep the top guard intact:
   ```php
   if (php_sapi_name() === 'cli') {
       handle_cli();
   } else {
       http_response_code(403);
       header('Content-Type: application/json');
       exit(json_encode(['error' => 'Forbidden']));
   }
   ```
5. Manually test (locally, with PHP available):
   `php public/admin-credentials-manager.php set MyNewPass123` then confirm
   `public/.admin-credentials.json` is updated.

**Task 2.2 — Stop rate-limiting the public content GET (API-01).**
1. Open `public/api.php`.
2. Near the top you will find:
   ```php
   require_once __DIR__ . '/rate_limit.php';
   nafas_check_rate_limit(300);
   ```
3. Move the rate-limit call so it only runs for `POST` requests. Delete the unconditional
   `nafas_check_rate_limit(300);` line. Then, inside the existing block that handles
   `if ($_SERVER['REQUEST_METHOD'] !== 'POST') { ... }` logic, ensure the GET path runs without
   `nafas_check_rate_limit`. The simplest explicit change: keep the `require_once`, and add the
   call **only** right before POST handling. For example, immediately after the line:
   ```php
   if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
       http_response_code(405);
       exit(json_encode(['error' => 'Method not allowed', 'valid' => false]));
   }
   ```
   add:
   ```php
   nafas_check_rate_limit(300); // throttle POST actions only (login/save/change_password)
   ```
   Make sure no `nafas_check_rate_limit` call remains before the `GET` handling block.
4. Leave `nafas_login_throttle_check()` inside the `login()` function unchanged — login brute-force
   protection must stay.

**Task 2.3 — Validate data URLs on the server (SEC-05, server side).**
1. Open `public/api.php`, function `save_data(...)`.
2. After the existing validation loop over `$catalogs`, add a helper check that every URL-bearing
   field is `http://`, `https://`, or `data:`. Add this small closure near the top of `save_data`:
   ```php
   $is_safe_url = function ($u): bool {
       if (!is_string($u) || $u === '') return true; // empty/optional allowed
       return (bool) preg_match('#^(https?:|data:)#i', $u);
   };
   ```
3. Inside the `foreach ($catalogs as $catalog)` loop, after the existing required-field check, add:
   ```php
   if (!$is_safe_url($catalog['coverImage'] ?? '') || !$is_safe_url($catalog['pdfUrl'] ?? '')) {
       http_response_code(400);
       exit(json_encode(['success' => false, 'error' => 'Unsafe URL in catalog']));
   }
   foreach (($catalog['pages'] ?? []) as $p) {
       if (!$is_safe_url($p)) {
           http_response_code(400);
           exit(json_encode(['success' => false, 'error' => 'Unsafe page URL']));
       }
   }
   ```
4. Mirror the same check in `scripts/dev-api.mjs` → `handleSaveData`: after the existing
   `for (const catalog of catalogs)` validation, add a regex test
   `/^(https?:|data:)/i` for `catalog.coverImage`, `catalog.pdfUrl`, and each `catalog.pages[]`,
   returning `jsonResponse(res, 400, { success:false, error:'Unsafe URL' })` on failure.

**Task 2.4 — Client-side URL validation helper (SEC-05, client side).**
1. Open `src/utils/helpers.ts`.
2. Add and export this function at the end of the file:
   ```ts
   /** Returns true only for http(s) (and optionally data:) URLs. */
   export function isSafeHttpUrl(input: string, allowData = false): boolean {
     try {
       const u = new URL(input, window.location.href);
       if (u.protocol === 'http:' || u.protocol === 'https:') return true;
       if (allowData && u.protocol === 'data:') return true;
       return false;
     } catch {
       return false;
     }
   }
   ```
3. Open `src/components/BookViewer.tsx`. Find `handleDownload`. Before using `catalog.pdfUrl` or
   `catalog.pages[0]`, guard them:
   - At the top of the file, update the import from helpers to include `isSafeHttpUrl`
     (there is an existing import: `import { ... } from '../utils/...'`? If not present, add
     `import { isSafeHttpUrl } from '../utils/helpers';`).
   - In `handleDownload`, wrap the `pdfUrl` branch with `if (catalog.pdfUrl && isSafeHttpUrl(catalog.pdfUrl))`
     and the pages branch with `else if (catalog.pages[0] && isSafeHttpUrl(catalog.pages[0]))`.
     If neither is safe, call `toast.error('آدرس نامعتبر است.')` and return.
4. Open `src/components/CatalogCard.tsx`. Find `handleDownloadPdf`. Apply the same guard:
   import `isSafeHttpUrl` from `../utils/helpers`, and only open/anchor `catalog.pdfUrl` /
   `catalog.pages[0]` when `isSafeHttpUrl(...)` is true; otherwise `toast.error('آدرس نامعتبر است.')`.
5. Open `src/components/HeroSlider.tsx`. For both places that render `banner.link` as an `<a href={banner.link}>`,
   only render the link when `isSafeHttpUrl(banner.link)` is true; otherwise render the same content
   without the anchor wrapper. Import `isSafeHttpUrl` from `../utils/helpers`.

**Task 2.5 — Reduce token-store writes (SEC-07).**
1. Open `public/api.php`, function `is_valid_token(string $submitted_token, string $token_file)`.
2. It currently calls `prune_tokens(load_tokens(...))` and then `write_tokens(...)` on **every** call.
   Remove the `write_tokens($token_file, $tokens);` line from `is_valid_token` so validation does not
   write to disk. Pruning-and-writing still happens in `login()` and `change_password()` where tokens are
   created/replaced, which is sufficient.

**Task 2.6 — Move secret state files out of the web root (SEC-09).**
1. Decide on a storage directory outside `public/`. Use a sibling directory at the project root, e.g.
   `<project>/storage/`.
2. Open `public/api.php`. Near the top where these are defined:
   ```php
   $credentials_file = __DIR__ . '/.admin-credentials.json';
   $token_file = __DIR__ . '/.admin-tokens.json';
   $content_dir = __DIR__ . '/data';
   $content_file = __DIR__ . '/data/content.json';
   ```
   Change them to point outside the web root:
   ```php
   $storage_dir = getenv('NAFAS_STORAGE_DIR') ?: (__DIR__ . '/../storage');
   if (!is_dir($storage_dir)) { mkdir($storage_dir, 0700, true); }
   $credentials_file = $storage_dir . '/.admin-credentials.json';
   $token_file = $storage_dir . '/.admin-tokens.json';
   $content_dir = $storage_dir . '/data';
   $content_file = $storage_dir . '/data/content.json';
   ```
3. Update `public/admin-credentials-manager.php` constants to match:
   ```php
   const STORAGE_DIR = __DIR__ . '/../storage';
   const CREDENTIALS_FILE = STORAGE_DIR . '/.admin-credentials.json';
   const TOKENS_FILE = STORAGE_DIR . '/.admin-tokens.json';
   ```
4. Update `scripts/dev-api.mjs` paths (`CREDENTIALS_FILE`, `TOKENS_FILE`, `CONTENT_FILE`) to also point
   to `join(__dirname, '..', 'storage', ...)` so dev and prod behave the same.
5. Add `storage/` to `.gitignore` (open `.gitignore`, add a line `storage/`).
6. Keep the existing `.htaccess` `FilesMatch "\.(txt|json)$"` deny rule as defense-in-depth.

### Things to be careful about
- Phase 2 Task 2.1 must remove **all** `global` lines in that file; missing one keeps that function broken.
- When moving files (Task 2.6), the app reads server content via `GET /api.php`, which now reads from the
  new path. If you had existing `public/data/content.json`, move it into `storage/data/` so saved content
  is preserved, or it will fall back to bundled data.
- The dev server (`dev-api.mjs`) and PHP (`api.php`) must use the **same** storage location semantics so
  behavior matches between dev and prod.

### Expected result
The credential CLI works; the public GET is never rate-limited; unsafe URLs are rejected by both servers
and never opened by the client; token validation no longer writes to disk; secret files live outside the
web root.

### ✅ Phase 2 Validation Checklist
- [ ] `grep -n "global \$CREDENTIALS_FILE\|global \$TOKENS_FILE" public/admin-credentials-manager.php` returns nothing.
- [ ] `admin-credentials-manager.php` has no `display_web_interface` and no HTTP POST handler.
- [ ] `public/api.php` calls `nafas_check_rate_limit` only on the POST path, not before GET.
- [ ] `save_data` (PHP) and `handleSaveData` (dev-api) reject a catalog whose `pdfUrl` is `javascript:alert(1)`.
- [ ] `isSafeHttpUrl` exists in `src/utils/helpers.ts` and is imported in BookViewer, CatalogCard, HeroSlider.
- [ ] `is_valid_token` no longer calls `write_tokens`.
- [ ] Credential/token/content paths resolve under `storage/` (outside `public/`); `storage/` is gitignored.
- [ ] `npm run build` succeeds; `npm run dev` starts the mock API without errors.

---

## Phase 3 – React Bug Fixes

### Goal
Fix correctness bugs in React components: double-counted analytics, illegal state mutation in the chatbot,
an unclickable preview button, dead streak-milestone toasts, an unguarded JSON parse, and a product-icon typo.

### Files to modify
- `src/components/BookViewer.tsx`
- `src/utils/analytics.ts`
- `src/components/ChatBot.tsx`
- `src/components/CatalogCard.tsx`
- `src/App.tsx`
- `src/hooks/useReadingStreak.ts`
- `src/components/ProductsSection.tsx`

### Exact issues covered
- BUG-01 — Catalog views double-counted with two conflicting analytics schemas.
- STATE-01 — Direct mutation of state objects in ChatBot.
- A11Y-01 — Hover preview “Open” button is unclickable.
- UX-04 — Reading-streak milestone toasts never fire; copy errors.
- MISC-07 — Unguarded `JSON.parse` of `nafas_analytics` in BookViewer.
- MISC-09 — `PRODUCT_ICONS` key typo (`megzolek` vs `meglozek`).

### Step-by-step implementation tasks

**Task 3.1 — Single analytics schema; remove double counting (BUG-01, MISC-07).**
1. Open `src/utils/analytics.ts`.
2. Extend the `AnalyticsData` interface to optionally hold per-page time:
   ```ts
   export interface AnalyticsData {
     viewsByCatalog: Record<string, number>;
     daily: Record<string, number>;
     timeByCatalogPage?: Record<string, Record<number, number>>;
   }
   ```
3. Add a new exported function:
   ```ts
   export function trackPageTime(catalogId: string, page: number, seconds: number): void {
     if (seconds <= 0) return;
     try {
       const key = STORAGE_KEYS.ANALYTICS;
       const existing = localStorage.getItem(key);
       const data: AnalyticsData = existing ? JSON.parse(existing) : { viewsByCatalog: {}, daily: {} };
       data.timeByCatalogPage = data.timeByCatalogPage ?? {};
       data.timeByCatalogPage[catalogId] = data.timeByCatalogPage[catalogId] ?? {};
       const prev = data.timeByCatalogPage[catalogId][page] ?? 0;
       data.timeByCatalogPage[catalogId][page] = prev + seconds;
       localStorage.setItem(key, JSON.stringify(data));
     } catch {
       // ignore storage errors
     }
   }
   ```
4. Open `src/components/BookViewer.tsx`.
5. Find the effect that increments views directly (it reads `localStorage.getItem('nafas_analytics')`,
   does `stats.viewsByCatalog[catalog.id] = (...) + 1`, and writes back). **Delete this entire effect.**
   The view is already counted by `trackCatalogView(...)` in the effect above it — leave that one intact.
6. Find the effect that tracks time per page (it sets `startTime`, and on cleanup computes `duration` and
   writes `stats.timeByCatalogPage`). Replace its body so it uses the new helper and `STORAGE_KEYS`:
   ```ts
   useEffect(() => {
     const startTime = Date.now();
     return () => {
       const duration = Math.floor((Date.now() - startTime) / 1000);
       trackPageTime(catalog.id, currentPage, duration);
     };
   }, [currentPage, catalog.id]);
   ```
7. Update the import at the top of `BookViewer.tsx`: it currently imports `{ trackCatalogView }`
   from `../utils/analytics`. Change it to `import { trackCatalogView, trackPageTime } from '../utils/analytics';`.
8. Remove any remaining direct use of the magic string `'nafas_analytics'` in `BookViewer.tsx`.

**Task 3.2 — Stop mutating state objects in ChatBot (STATE-01).**
1. Open `src/components/ChatBot.tsx`.
2. There are three places that do something like:
   ```ts
   const copy = [...prev]; // or [...messages]
   if (copy.length > 0) copy[copy.length - 1].suggestions = undefined;
   ```
   This mutates an object that is also stored in React state. For **each** of the three places, replace the
   mutating line with an immutable update that creates a new object:
   ```ts
   if (copy.length > 0) {
     copy[copy.length - 1] = { ...copy[copy.length - 1], suggestions: undefined };
   }
   ```
   The three locations are: inside `startChat`, inside the `addPromptWithSuggestions` helper in `send`,
   and inside the `setMessages(prev => { ... })` call in `send` that clears suggestions before appending
   the user message.
3. Do not change any other chatbot logic.

**Task 3.3 — Fix the unclickable hover-preview button (A11Y-01).**
1. Open `src/components/CatalogCard.tsx`.
2. Find the `createPortal(...)` block that renders the hover preview (`showPreview && previewPos && createPortal(...)`).
   The outer `motion.div` has the class `pointer-events-none`, but it contains a “باز کردن” (Open) button
   that can therefore never be clicked.
3. Choose the simplest correct fix: **remove the Open button** because the whole card already opens the
   catalog on click and the preview is informational. Delete the `<button ...>باز کردن</button>` element
   from inside the preview portal. Keep the cover image, title, description, and meta.
4. Leave `pointer-events-none` on the preview container (it should not intercept the mouse).

**Task 3.4 — Wire up reading-streak milestone toasts and fix copy (UX-04).**
1. Open `src/hooks/useReadingStreak.ts`.
2. Fix the copy bugs in `checkStreakMilestone`:
   - The 14-day message is `'🔥۱۴ روز متوالی! نمونه ایده‌ال هستید!'` — add a space after `🔥`:
     `'🔥 ۱۴ روز متوالی! نمونه ایده‌آل هستید!'`.
   - The 30-day message `'🔥 ۱ ماه! شما یک پرستار درآمدی هستید!'` is nonsensical — change to
     `'🔥 ۱ ماه متوالی! فوق‌العاده‌اید!'`.
3. Open `src/App.tsx`.
4. At the top, the existing import from the hook is `import { useReadingStreak } from './hooks/useReadingStreak';`.
   Change it to also import the checker:
   `import { useReadingStreak, checkStreakMilestone } from './hooks/useReadingStreak';`
5. The component currently destructures `const { recordRead } = useReadingStreak();`. Change it to also get
   `streak`: `const { recordRead, streak } = useReadingStreak();`.
6. Find `handleOpenCatalog` (wrapped in `useCallback`). It already calls `recordRead()`. Immediately after
   `recordRead();`, add:
   ```ts
   const milestone = checkStreakMilestone(streak);
   if (milestone) toast.success(milestone);
   ```
   Add `streak` to the `useCallback` dependency array of `handleOpenCatalog` (it currently lists
   `[addRecent, recordRead]`; make it `[addRecent, recordRead, streak]`).
7. `toast` is already imported in `App.tsx` from `react-hot-toast`; no new import needed.

**Task 3.5 — Fix the product-icon key typo (MISC-09).**
1. Open `src/components/ProductsSection.tsx`.
2. In the `PRODUCT_ICONS` object, the key `megzolek` is misspelled. The product id is `meglozek`
   (see `src/constants/products.ts`). Rename the key `megzolek` to `meglozek`. Keep the same icon value (`Baby`).

### Things to be careful about
- In Task 3.1, ensure you delete the **view-increment** effect, not the `trackCatalogView` effect. After the
  change, opening a catalog must increment the view count by exactly 1.
- In Task 3.2, do not switch to `.map(...)` if the surrounding code relies on appending afterward — just replace
  the single mutated element with a spread copy, exactly as shown.
- In Task 3.4, milestone uses the **current** `streak` value (state before this open is recorded). That is
  acceptable; do not attempt to compute the post-increment streak synchronously.

### Expected result
Opening a catalog counts one view and writes a single coherent analytics object. ChatBot never mutates state.
The preview no longer shows a dead button. Streak milestones toast with correct Persian copy. The Meglozek
product shows the `Baby` icon.

### ✅ Phase 3 Validation Checklist
- [ ] Open a catalog once; in DevTools, `JSON.parse(localStorage.nafas_analytics).viewsByCatalog[<id>]` increased by exactly 1.
- [ ] `nafas_analytics` contains keys `viewsByCatalog`, `daily`, and (after reading) `timeByCatalogPage` — one object, no clobbering.
- [ ] `grep -n "\.suggestions = undefined" src/components/ChatBot.tsx` returns nothing (all replaced by spread copies).
- [ ] The hover preview no longer renders an “Open” button; hovering still shows the card.
- [ ] Reaching a 3-day streak shows a toast; the 14-/30-day strings read correctly.
- [ ] `ProductsSection.tsx` `PRODUCT_ICONS` has key `meglozek` (not `megzolek`).
- [ ] `npm run build` succeeds.

---

## Phase 4 – Performance

### Goal
Eliminate per-render Cache Storage scans, memoize expensive derived values, prevent the catalog grid from
re-rendering on unrelated state changes, reduce typewriter/audio churn, and stabilize the favorites array.

### Files to modify
- `src/hooks/useCachedCatalogs.ts`
- `src/components/CatalogCard.tsx`
- `src/App.tsx`
- `src/components/ChatBot.tsx`
- `src/hooks/useFavorites.ts`

### Exact issues covered
- PERF-01 — `useCachedCatalogs([catalog.id])` re-runs its effect every render.
- PERF-02 — `paletteCommands` and `filteredVideos` rebuilt every render.
- PERF-03 — `CatalogCard` not memoized; whole grid re-renders.
- PERF-04 — Typewriter re-renders char-by-char; remote flip-sound re-instantiated.
- REF-05 — `useFavorites` returns a new array reference each render.

### Step-by-step implementation tasks

**Task 4.1 — Make `useCachedCatalogs` accept a single id (PERF-01).**
1. Open `src/hooks/useCachedCatalogs.ts`.
2. Change the function signature from `useCachedCatalogs(catalogIds: string[]): Set<string>` to
   `useCachedCatalogs(catalogId: string): boolean`.
3. Replace the body so the effect depends on the **string** `catalogId` (a primitive, stable across renders),
   opens the cache once, and sets a boolean:
   ```ts
   import { useState, useEffect } from 'react';

   export function useCachedCatalogs(catalogId: string): boolean {
     const [isCached, setIsCached] = useState(false);
     useEffect(() => {
       if (!('caches' in window)) return;
       let cancelled = false;
       (async () => {
         try {
           const cache = await caches.open('assets-cache');
           const keys = await cache.keys();
           const found = keys.some(k => k.url.includes(catalogId));
           if (!cancelled) setIsCached(found);
         } catch {
           /* ignore */
         }
       })();
       return () => { cancelled = true; };
     }, [catalogId]);
     return isCached;
   }
   ```
4. Open `src/components/CatalogCard.tsx`. It currently calls
   `const cachedIds = useCachedCatalogs([catalog.id]); const isCached = cachedIds.has(catalog.id);`.
   Replace both lines with: `const isCached = useCachedCatalogs(catalog.id);`.

**Task 4.2 — Memoize `filteredVideos` and `paletteCommands` (PERF-02).**
1. Open `src/App.tsx`.
2. Find `filteredVideos` — it is currently an IIFE `const filteredVideos = (() => { ... })();`.
   Replace it with a `useMemo`:
   ```ts
   const filteredVideos = useMemo(() => {
     const query = videoSearch.trim().toLowerCase();
     if (!query) return videos;
     return videos.filter(v =>
       v.title.toLowerCase().includes(query) ||
       v.description.toLowerCase().includes(query)
     );
   }, [videos, videoSearch]);
   ```
   `useMemo` is already imported in `App.tsx`.
3. Find `const paletteCommands: PaletteCommand[] = [ ... ];`. Wrap it in `useMemo`:
   ```ts
   const paletteCommands: PaletteCommand[] = useMemo(() => [
     // ...exact same array contents as before...
   ], [catalogs, setTheme, clearRecent, clearFavorites, handleOpenCatalog]);
   ```
   Keep the array contents identical. Include in the dependency array every value used inside
   (theme setters are stable, but list the ones referenced: `catalogs`, `handleOpenCatalog`,
   `clearRecent`, `clearFavorites`, `setTheme`, `setViewMode`, `setShowCommandPalette`). If unsure
   whether a setter is stable, include it — `useState` setters are stable and safe to list.

**Task 4.3 — Memoize `CatalogCard` (PERF-03).**
1. Open `src/components/CatalogCard.tsx`.
2. At the bottom, it ends with `export default CatalogCard;`. Wrap the component in `React.memo`:
   - Ensure `React` is imported (it is).
   - Change the export to: `export default React.memo(CatalogCard);`.
3. Confirm the props passed from `App.tsx` (`onClick`, `onToggleFavorite`) are already created with
   `useCallback` (they are). Do not add new inline arrow functions as props to `CatalogCard` in `App.tsx`.

**Task 4.4 — Reduce Typewriter churn and respect reduced motion; bundle the flip sound (PERF-04).**
1. Open `src/components/ChatBot.tsx`, component `Typewriter`.
2. Add a reduced-motion short-circuit at the start of its effect: if the user prefers reduced motion,
   show the full text immediately and call `onDone()`:
   ```ts
   useEffect(() => {
     if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       setShown(text);
       onDone();
       return;
     }
     let i = 0;
     const id = setInterval(() => {
       i += 3;
       setShown(text.slice(0, i));
       if (i >= text.length) { clearInterval(id); onDone(); }
     }, 18);
     return () => clearInterval(id);
   }, [text, onDone]);
   ```
3. Open `src/components/BookViewer.tsx`. The page-flip sound uses a remote URL constant
   `PAGE_FLIP_SOUND_URL = 'https://nafaspharmed.com/mp3/paper.mp3'`. To remove the network
   dependency, place a local audio file at `public/paper.mp3` (if you cannot add a binary asset,
   skip this sub-step and leave the remote URL — do not break the build). If you add the local file,
   change the constant to `const PAGE_FLIP_SOUND_URL = '/paper.mp3';`.
   The existing code already reuses a single `audioRef` instance — do not create new `Audio` objects
   per flip.

**Task 4.5 — Stabilize the favorites array (REF-05).**
1. Open `src/hooks/useFavorites.ts`.
2. The return currently includes `favorites: Array.from(favorites)`. Add a memoized array:
   - Import `useMemo` (add it to the existing `import { useState, useCallback, useEffect } from 'react';`
     → `import { useState, useCallback, useEffect, useMemo } from 'react';`).
   - Before the `return`, add: `const favoritesArray = useMemo(() => Array.from(favorites), [favorites]);`
   - In the returned object change `favorites: Array.from(favorites)` to `favorites: favoritesArray`.

### Things to be careful about
- After Task 4.1, no other file may call `useCachedCatalogs` with an array. Search the codebase; only
  `CatalogCard.tsx` uses it.
- In Task 4.2, the `useMemo` dependency arrays must include everything used inside, or stale values will be
  shown. When in doubt, include the value. Do **not** leave the dependency array empty.
- `React.memo` (Task 4.3) only helps if props are referentially stable. If you accidentally pass a new inline
  function to `CatalogCard`, the memo does nothing — verify in `App.tsx`.

### Expected result
Cards check the cache at most once per id instead of every render; search typing no longer rebuilds command/video
lists unnecessarily; unaffected cards stop re-rendering; long chatbot replies don’t jank and respect reduced
motion; favorites consumers stop recomputing each render.

### ✅ Phase 4 Validation Checklist
- [ ] `useCachedCatalogs` takes a `string` and returns a `boolean`; `CatalogCard` calls `useCachedCatalogs(catalog.id)`.
- [ ] `grep -n "useCachedCatalogs(\[" src` returns nothing.
- [ ] `filteredVideos` and `paletteCommands` are wrapped in `useMemo` with non-empty dependency arrays.
- [ ] `CatalogCard` is exported via `React.memo(...)`.
- [ ] Using the React DevTools Profiler, typing in the header search no longer re-renders every catalog card.
- [ ] Typewriter shows full text instantly when OS “reduce motion” is on.
- [ ] `useFavorites` returns a memoized `favorites` array.
- [ ] `npm run build` succeeds.

---

## Phase 5 – Architecture & Refactoring

### Goal
Align the path alias between TypeScript and Vite, correct environment typings, remove dead code/utilities,
and introduce a shared modal/focus-trap primitive to de-duplicate accessibility logic.

### Files to modify / create
- `tsconfig.json`
- `src/vite-env.d.ts`
- `src/utils/cn.ts` (delete if unused)
- `src/utils/confetti.ts` (delete if unused)
- `src/utils/tts.ts`
- `package.json` (only if removing now-unused deps)
- `src/hooks/useFocusTrap.ts` (create)
- `src/components/BookViewer.tsx`, `src/components/VideoPlayer.tsx` (adopt the hook)

### Exact issues covered
- ARCH-01 — `@/*` alias maps differently in `tsconfig` vs Vite.
- TS-01 — Stale env typings (`VITE_ADMIN_PASSWORD` present; `VITE_WP_BASE_URL` missing).
- REF-01 — Dead/unused utilities (`cn`, `confetti`, extra `tts` exports).
- REF-02 — Duplicated focus-trap logic across modals.

### Step-by-step implementation tasks

**Task 5.1 — Fix the path alias (ARCH-01).**
1. Open `tsconfig.json`.
2. In `compilerOptions.paths`, change `"@/*": ["./*"]` to `"@/*": ["./src/*"]` so it matches
   `vite.config.ts` (which maps `@` to `./src`).
3. Do not introduce new `@/` imports right now; this only makes the two configs agree.

**Task 5.2 — Correct environment typings (TS-01).**
1. Open `src/vite-env.d.ts`.
2. In `interface ImportMetaEnv`, **remove** the line `readonly VITE_ADMIN_PASSWORD?: string;`.
3. **Add** `readonly VITE_WP_BASE_URL?: string;` (and keep `readonly VITE_API_BASE_URL?: string;`).
4. Confirm `grep -rn "VITE_ADMIN_PASSWORD" src` returns nothing.

**Task 5.3 — Remove dead utilities (REF-01).**
1. Confirm `cn` is unused: `grep -rn "from '.*utils/cn'" src` and `grep -rn "\bcn(" src`. If both return
   nothing meaningful, delete `src/utils/cn.ts`.
2. If you deleted `cn.ts`, check whether `clsx` and `tailwind-merge` are used elsewhere
   (`grep -rn "clsx\|tailwind-merge" src`). If unused, remove them from `dependencies` in `package.json`.
   **Only** remove deps you have proven are unused.
3. Confirm `fireConfetti` is unused: `grep -rn "fireConfetti" src`. If only its own definition shows,
   delete `src/utils/confetti.ts`.
4. In `src/utils/tts.ts`, the functions `isSpeaking`, `getAvailableVoices`, and `getPersianVoice` are unused
   (`grep -rn "isSpeaking\|getAvailableVoices\|getPersianVoice" src` — verify only definitions appear).
   Delete those three functions; keep `speakText` and `stopSpeaking` (used by `CatalogCard`).

**Task 5.4 — Create a shared focus-trap hook and adopt it in two modals (REF-02).**
1. Create a new file `src/hooks/useFocusTrap.ts` with this content:
   ```ts
   import { useEffect, RefObject } from 'react';

   function getFocusable(root: HTMLElement): HTMLElement[] {
     return Array.from(
       root.querySelectorAll<HTMLElement>(
         'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
       )
     ).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
   }

   /** Traps Tab focus inside `ref`, calls `onClose` on Escape, and restores focus on unmount. */
   export function useFocusTrap(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
     useEffect(() => {
       const previous = document.activeElement as HTMLElement | null;
       const root = ref.current;
       if (!root) return;
       const focusables = getFocusable(root);
       (focusables[0] ?? root).focus();

       const onKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
         if (e.key !== 'Tab') return;
         const items = getFocusable(root);
         if (items.length === 0) return;
         const first = items[0]!;
         const last = items[items.length - 1]!;
         if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
         else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
       };
       document.addEventListener('keydown', onKeyDown);
       return () => {
         document.removeEventListener('keydown', onKeyDown);
         previous?.focus?.();
       };
     }, [ref, onClose]);
   }
   ```
2. Open `src/components/VideoPlayer.tsx`. It defines an inline `getFocusable` callback and a `useEffect`
   that implements the focus trap. Replace that local implementation:
   - Add the import: `import { useFocusTrap } from '../hooks/useFocusTrap';`
   - Delete the local `getFocusable` `useCallback` and the focus-trap `useEffect`.
   - Add a single call near the other hooks: `useFocusTrap(dialogRef, onClose);`
   - Keep `dialogRef` and everything else.
3. Open `src/components/BookViewer.tsx`. It has an equivalent local `getFocusable` + focus-trap `useEffect`
   (the one that also handles Escape). Replace it the same way:
   - Add `import { useFocusTrap } from '../hooks/useFocusTrap';`
   - Delete the local `getFocusable` `useCallback` and the focus-trap `useEffect` (the one binding Tab/Escape).
   - Add `useFocusTrap(dialogRef, onClose);`
   - **Careful:** BookViewer has a *second*, separate `useEffect` for arrow-key page navigation. Do **not**
     delete that one — only remove the focus-trap effect.

### Things to be careful about
- Only delete a dependency from `package.json` after proving it is unused; deleting a used dep breaks the build.
- When adopting `useFocusTrap`, ensure the ref you pass (`dialogRef`) is the element that wraps the modal’s
  focusable content. In BookViewer, `dialogRef` and `containerRef` point to the same element via the callback
  ref — passing `dialogRef` is correct.
- Do not remove `speakText`/`stopSpeaking` from `tts.ts`; `CatalogCard` imports them.

### Expected result
`tsc` and Vite resolve `@/*` identically; env typings match real usage; dead modules are gone; both heavy
modals use one shared, consistent focus trap.

### ✅ Phase 5 Validation Checklist
- [ ] `tsconfig.json` `paths` is `"@/*": ["./src/*"]`.
- [ ] `src/vite-env.d.ts` has `VITE_WP_BASE_URL`, not `VITE_ADMIN_PASSWORD`.
- [ ] `src/utils/cn.ts` and `src/utils/confetti.ts` deleted (if proven unused); build still works.
- [ ] `tts.ts` exports only `speakText` and `stopSpeaking`.
- [ ] `src/hooks/useFocusTrap.ts` exists; `VideoPlayer` and `BookViewer` import and call it.
- [ ] BookViewer still navigates pages with ← → arrow keys (that effect was not removed).
- [ ] Tab cycles within both modals; Escape closes them; focus returns to the trigger on close.
- [ ] `npm run build` succeeds.

---

## Phase 6 – UI/UX & Accessibility

### Goal
Make admin entry consistent, fix video autoplay and dialog semantics, add a privacy/consent notice to the
PII forms, correct misleading offline copy, replace flag-only language controls with text labels, use a local
favicon, add focus traps/Escape to remaining modals, and honor reduced motion globally.

### Files to modify
- `src/App.tsx`
- `src/components/VideoPlayer.tsx`
- `src/components/ChatBot.tsx`
- `index.html`
- `src/components/QrModal.tsx`, `src/components/PhoneDirectory.tsx`
- `src/index.css`

### Exact issues covered
- UX-01 — Unify the admin entry path (logo-click vs command palette history mismatch).
- UX-02 — Video autoplay with sound; dialog role on the backdrop.
- UX-05 — Offline banner claims cached content even on a first offline load.
- UX-06 — Language filter uses flag emoji to represent languages.
- SEC-08 — Patient PII forms lack a consent/privacy notice.
- MISC-03 — Favicon loads from a remote URL.
- MISC-04 — `QrModal` and `PhoneDirectory` lack focus trapping / Escape.
- MISC-05 — No global `prefers-reduced-motion` handling.

### Step-by-step implementation tasks

**Task 6.1 — Unify admin entry (UX-01).**
1. Open `src/App.tsx`.
2. Find the command-palette command with `id: 'admin-panel'`. Its `action` currently calls
   `setViewMode('admin-login')` directly, which does **not** push the `#admin` history entry that
   `enterAdmin` adds (the popstate handler relies on `#admin`).
3. Change that action to call `enterAdmin()` and close the palette:
   ```ts
   action: () => { enterAdmin(); setShowCommandPalette(false); },
   ```
4. Leave the 5-click logo behavior as-is (it already calls `enterAdmin` via the `logoClicks` effect).
   Now both entries use `enterAdmin` and share consistent back-button behavior.

**Task 6.2 — Fix video autoplay and dialog semantics (UX-02).**
1. Open `src/components/VideoPlayer.tsx`.
2. The outermost backdrop `div` currently has `role="dialog"`, `aria-modal="true"`, and `aria-label`.
   Remove those three attributes from the **backdrop** div (keep its `onClick={onClose}` and classes).
3. Move the dialog semantics onto the inner panel div (the one with `ref={dialogRef}` and
   `onClick={(e) => e.stopPropagation()}`). Add to that inner div:
   `role="dialog" aria-modal="true" aria-label={\`پخش ویدئو: ${video.title}\`}`.
4. The `<video>` element has `autoPlay` without `muted`. Add `muted` to it so autoplay is allowed by browsers:
   change the attributes to include `muted` (users can unmute via native controls, which are present).

**Task 6.3 — Add a privacy/consent notice to PII forms (SEC-08).**
1. Open `src/components/ChatBot.tsx`.
2. In `AdrForm`, just above the submit/cancel button row (`<div className="grid grid-cols-2 ...">`),
   add a short notice:
   ```tsx
   <p className="text-[11px] text-skin-muted leading-relaxed">
     با ارسال این فرم، با ثبت و پردازش اطلاعات تماس شما برای پیگیری موافقت می‌کنید.
   </p>
   ```
3. Add the identical notice in `ConsultForm` in the same position (above its button row).
4. Do not change the submit logic.

**Task 6.4 — Fix misleading offline banner copy (UX-05).**
1. Open `src/App.tsx`.
2. Find the offline banner (`{!isOnline && ( ... )}`) which shows
   `آفلاین هستید — محتوای ذخیره‌شده نمایش داده می‌شود`.
3. The `useCatalogs()` hook already exposes `isLoading` and `error`. To avoid promising cached content
   when there may be none, change the banner text to a neutral statement:
   `آفلاین هستید — برخی قابلیت‌ها در دسترس نیست`.
   (Keep the same markup and the 📡 icon; only change the sentence.)

**Task 6.5 — Replace flag-only language controls with text labels (UX-06).**
1. Open `src/App.tsx`.
2. Find the two language-filter buttons (the `🇮🇷` and `🇬🇧` buttons in the catalogs filter row).
3. For each button, replace the emoji-only content with a text label and keep the existing `title`/`aria`:
   - The Persian button: content `FA`, add `aria-label="فیلتر فارسی"` (it already has `title`).
   - The English button: content `EN`, add `aria-label="فیلتر انگلیسی"`.
   You may keep a small flag before the text if desired, but the accessible name must be the text label.

**Task 6.6 — Use a local favicon (MISC-03).**
1. Open `index.html`.
2. Find `<link rel="icon" href="https://nafaspharmed.com/wp-content/uploads/2025/11/cropped-favicon-1.png" />`.
3. Replace the remote `href` with the local asset already present in `public/`:
   `<link rel="icon" href="/favicon.svg" />`.

**Task 6.7 — Add focus trap + Escape to QrModal and PhoneDirectory (MISC-04).**
> This depends on `useFocusTrap` created in Phase 5. If Phase 5 is not yet done, create that hook first
> (see Phase 5, Task 5.4) — it is the only cross-phase dependency and is required here.
1. Open `src/components/QrModal.tsx`.
2. Add `import { useFocusTrap } from '../hooks/useFocusTrap';` and add a ref for the panel:
   create `const panelRef = useRef<HTMLDivElement>(null);` (the `useRef` import already exists).
3. Put `ref={panelRef}` on the inner panel `div` (the one with `onClick={e => e.stopPropagation()}`),
   and add `role="dialog" aria-modal="true"` to it.
4. Call `useFocusTrap(panelRef, onClose);` inside the component.
5. Repeat the same pattern for `src/components/PhoneDirectory.tsx`: import the hook, add a `panelRef` to the
   inner panel `div`, add `role="dialog" aria-modal="true"`, and call `useFocusTrap(panelRef, onClose)`.
   (`PhoneDirectory` already returns `null` when `!open`, so the hook only runs while open.)

**Task 6.8 — Global reduced-motion support (MISC-05).**
1. Open `src/index.css`.
2. At the end of the file, add a media query that disables long/looping animations for users who request it:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.001ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.001ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

### Things to be careful about
- Task 6.7 requires `src/hooks/useFocusTrap.ts` from Phase 5. If you run Phase 6 independently, create that
  file first using the snippet in Phase 5, Task 5.4.
- In Task 6.2, `muted` is required for reliable autoplay; do not remove the native `controls`.
- Keep all Persian copy grammatically correct; do not translate to English.

### Expected result
One admin-entry code path with consistent history; videos autoplay reliably and expose correct dialog
semantics; PII forms show consent; offline copy is accurate; language filters are screen-reader friendly;
the favicon is local; all modals trap focus and close on Escape; motion-sensitive users get minimal animation.

### ✅ Phase 6 Validation Checklist
- [ ] The command-palette “admin” action and the 5-click logo both push `#admin` and the browser Back button returns to the site.
- [ ] In `VideoPlayer`, `role="dialog"`/`aria-modal` is on the inner panel; the `<video>` has `muted` and autoplays.
- [ ] `AdrForm` and `ConsultForm` show a consent sentence above their buttons.
- [ ] Offline banner text no longer promises cached content.
- [ ] Language filter buttons expose `FA`/`EN` accessible names (verify with a screen reader or the accessibility tree).
- [ ] `index.html` favicon points to `/favicon.svg`.
- [ ] QrModal and PhoneDirectory trap Tab focus and close on Escape.
- [ ] With OS “reduce motion” enabled, shimmer/pulse/confetti/typewriter animations are effectively disabled.
- [ ] `npm run build` succeeds.

---

## Phase 7 – Production Readiness

### Goal
Add quality gates (type-check, lint) and a cross-platform dev script, ensure logging/caching consistency,
set explicit cache headers, guard against localStorage quota issues, and document deploy/provisioning.

### Files to modify / create
- `package.json`
- `.eslintrc.cjs` (create) — or `eslint.config.js` if you prefer flat config
- `.env.example` (create)
- `README.md` (create at project root)
- `public/api.php`
- `src/context/CatalogContext.tsx`
- `vite.config.ts`

### Exact issues covered
- ERR-01 — No type-check in build, no lint/tests/CI; non-portable `dev` script.
- MISC-01 — `dev`/`dev:all` duplication; `&` is POSIX-only.
- MISC-02 — `console.debug` listed in esbuild `pure` yet used as a kept diagnostic.
- MISC-11 — No explicit cache headers on `api.php` JSON responses.
- MISC-12 — Full dataset written to localStorage on every change (quota risk).

### Step-by-step implementation tasks

**Task 7.1 — Add type-check and lint scripts; fix the dev script (ERR-01, MISC-01).**
1. Open `package.json`.
2. In `scripts`, add `"typecheck": "tsc --noEmit"`.
3. Change `"build"` from `"vite build"` to `"tsc --noEmit && vite build"` so type errors fail the build.
4. Install a cross-platform runner and ESLint as dev deps:
   `npm install -D concurrently eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks`
5. Replace the `dev` and `dev:all` scripts (which use `node scripts/dev-api.mjs & vite`) with a single
   cross-platform script and remove the duplicate:
   ```json
   "dev": "concurrently \"node scripts/dev-api.mjs\" \"vite\"",
   "dev:api": "node scripts/dev-api.mjs",
   ```
   Delete the `dev:all` entry.
6. Add `"lint": "eslint . --ext .ts,.tsx"`.

**Task 7.2 — Add an ESLint config (ERR-01).**
1. Create `.eslintrc.cjs` at the project root:
   ```js
   module.exports = {
     root: true,
     parser: '@typescript-eslint/parser',
     parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
     plugins: ['@typescript-eslint', 'react-hooks'],
     extends: [
       'eslint:recommended',
       'plugin:@typescript-eslint/recommended',
     ],
     rules: {
       'react-hooks/rules-of-hooks': 'error',
       'react-hooks/exhaustive-deps': 'warn',
       'no-unused-vars': 'off',
       '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
     },
     ignorePatterns: ['dist', 'node_modules', 'public/data.js', 'data.ts'],
     env: { browser: true, es2022: true, node: true },
   };
   ```
2. Run `npm run lint` once; fix only **errors** that block (not warnings) if any appear. Do not mass-rewrite
   code to satisfy style warnings.

**Task 7.3 — Make esbuild log-dropping consistent (MISC-02).**
1. Open `vite.config.ts`.
2. In `esbuild.pure`, the list includes `'console.debug'`, but the code uses `console.debug` as a kept
   diagnostic in a few places. Decide one policy and apply it: to **keep** debug logs out of production
   bundles, leave `'console.debug'` in `pure` (current behavior) — this is fine. To keep them, remove
   `'console.debug'` from the `pure` array. Choose to **remove** it from `pure` so the intentional
   `console.debug` diagnostics survive; final array: `pure: ['console.log', 'console.info']`.
   (This is a one-line, low-risk change; pick removal for consistency with the code’s intent.)

**Task 7.4 — Set explicit cache headers on `api.php` (MISC-11).**
1. Open `public/api.php`.
2. Near the top where headers are set (after the `Content-Type` header), add:
   ```php
   header('Cache-Control: no-store, max-age=0');
   ```
   This prevents intermediaries from caching admin/content JSON responses.

**Task 7.5 — Guard localStorage writes against quota errors (MISC-12).**
1. Open `src/context/CatalogContext.tsx`.
2. Find the `useEffect` that persists `catalogs`/`videos`/`banners` to localStorage. It already has a
   `try/catch` that warns on failure — confirm it is present. If any `localStorage.setItem` in this file is
   **not** inside a try/catch, wrap it so a quota error cannot crash the app. Do not change the data shape.

**Task 7.6 — Add `.env.example` and a root `README.md` (production readiness / provisioning).**
1. Create `.env.example` at the project root:
   ```
   # Frontend (Vite)
   VITE_API_BASE_URL=.
   VITE_WP_BASE_URL=https://nafaspharmed.com

   # Dev API server (scripts/dev-api.mjs)
   DEV_ADMIN_PASSWORD=changeme-dev-only

   # PHP backend (set in server environment)
   # NAFAS_ADMIN_PASSWORD_HASH=<bcrypt hash>
   # NAFAS_STORAGE_DIR=/absolute/path/outside/webroot
   # ALLOWED_ORIGINS=https://patient.nafaspharmed.com
   ```
2. Create `README.md` at the project root documenting:
   - Install / dev / build commands.
   - That the admin password must be provisioned via `NAFAS_ADMIN_PASSWORD_HASH` (bcrypt) and rotated.
   - That `storage/` holds secrets and must live outside the web root.
   - How to generate a bcrypt hash (e.g., `php -r "echo password_hash('yourpw', PASSWORD_BCRYPT);"`).

### Things to be careful about
- Adding `tsc --noEmit` to `build` may surface pre-existing type errors. If the build now fails on a real type
  error introduced in earlier phases, fix that specific error; do not disable `strict` or weaken `tsconfig`.
- Do not commit a real `.env` — only `.env.example`. Confirm `.env` is already gitignored (it is).
- `concurrently` must be installed before the new `dev` script will run.

### Expected result
Builds fail on type errors; lint runs; `npm run dev` works on Windows/macOS/Linux; API responses are
non-cacheable; localStorage failures degrade gracefully; deployment/provisioning is documented.

### ✅ Phase 7 Validation Checklist
- [ ] `npm run typecheck` exists and passes.
- [ ] `npm run build` runs `tsc --noEmit` first and fails on a deliberate type error (revert the test error after).
- [ ] `npm run lint` runs without crashing.
- [ ] `dev:all` is removed; `dev` uses `concurrently` and starts both processes on a non-Unix shell.
- [ ] `vite.config.ts` `esbuild.pure` is `['console.log', 'console.info']`.
- [ ] `api.php` sends `Cache-Control: no-store`.
- [ ] Every `localStorage.setItem` in `CatalogContext.tsx` is inside a `try/catch`.
- [ ] `.env.example` and root `README.md` exist with provisioning instructions.

---

## Cross-Phase Dependency Notes
- **Phase 6, Task 6.7** depends on **Phase 5, Task 5.4** (`src/hooks/useFocusTrap.ts`). If executing Phase 6
  before Phase 5, create that hook first using the snippet in Phase 5.
- All other phases are independent and can be executed in the listed order without forward knowledge.
- After completing all phases, do a final full pass: `npm install` → `npm run lint` → `npm run typecheck` →
  `npm run build` → manual smoke test (`npm run dev`).

## Suggested Execution Order
Run phases **1 → 2 → 3 → 4 → 5 → 6 → 7**. Complete each phase’s Validation Checklist before starting the next.
Security phases (1–2) are highest priority; quality gates (Phase 7) catch regressions from all prior phases.
