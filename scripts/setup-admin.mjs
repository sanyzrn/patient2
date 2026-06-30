/**
 * NAFAS Admin Setup
 *
 * Generates storage/.admin-credentials.json locally using bcryptjs.
 * Upload the generated file to your server's storage/ directory
 * (one level above public_html) via FTP or cPanel File Manager.
 *
 * Usage:
 *   npm run setup                          ← interactive prompt
 *   npm run setup -- MySecurePassword123   ← non-interactive
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = resolve(__dirname, '..', 'storage');
const CREDENTIALS_FILE = resolve(STORAGE_DIR, '.admin-credentials.json');

const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN  = '\x1b[36m';
const YELLOW= '\x1b[33m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';

function line(char = '─', len = 60) { return char.repeat(len); }

async function getPassword() {
  const arg = process.argv[2];
  if (arg && arg.length >= 8) return arg;

  if (arg && arg.length < 8) {
    console.error(`${RED}خطا: رمز عبور باید حداقل ۸ کاراکتر باشد.${RESET}`);
    process.exit(1);
  }

  const rl = createInterface({ input, output });
  console.log('');
  console.log(`${BOLD}${CYAN}${line()}${RESET}`);
  console.log(`${BOLD}   NAFAS Admin Setup — تنظیم رمز عبور مدیریت${RESET}`);
  console.log(`${BOLD}${CYAN}${line()}${RESET}`);
  console.log('');

  let password;
  while (true) {
    password = await rl.question(`  رمز عبور جدید (حداقل ۸ کاراکتر): `);
    if (password.length >= 8) break;
    console.log(`  ${RED}رمز باید حداقل ۸ کاراکتر باشد، دوباره امتحان کن.${RESET}`);
  }

  const confirm = await rl.question(`  تکرار رمز عبور: `);
  rl.close();

  if (password !== confirm) {
    console.error(`\n  ${RED}رمزها یکی نیستند. دوباره اجرا کن.${RESET}\n`);
    process.exit(1);
  }

  return password;
}

async function main() {
  const password = await getPassword();

  console.log(`\n  ${YELLOW}در حال هش‌کردن رمز...${RESET}`);
  const hashed = await bcrypt.hash(password, 12);

  const credentials = {
    password:   hashed,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    note:       'Generated locally via npm run setup'
  };

  if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });

  console.log('');
  console.log(`${BOLD}${GREEN}${line()}${RESET}`);
  console.log(`${BOLD}${GREEN}   ✓  فایل اعتبارنامه ساخته شد${RESET}`);
  console.log(`${BOLD}${GREEN}${line()}${RESET}`);
  console.log('');
  console.log(`  مسیر محلی:  ${BOLD}storage/.admin-credentials.json${RESET}`);
  console.log('');
  console.log(`${BOLD}  مراحل بعدی (روی هاست):${RESET}`);
  console.log('');
  console.log(`  ۱) با FTP یا File Manager پوشه‌ای به نام  ${BOLD}storage${RESET}`);
  console.log(`     یک سطح بالاتر از public_html بساز:`);
  console.log(`     ${CYAN}/home/YOURUSERNAME/storage/${RESET}`);
  console.log('');
  console.log(`  ۲) فایل  ${BOLD}storage/.admin-credentials.json${RESET}  رو به:`);
  console.log(`     ${CYAN}/home/YOURUSERNAME/storage/.admin-credentials.json${RESET}`);
  console.log(`     آپلود کن.`);
  console.log('');
  console.log(`  ۳) فایل‌های  ${BOLD}public/api.php${RESET}  و  ${BOLD}public/rate_limit.php${RESET}  رو`);
  console.log(`     به ریشه‌ی  ${BOLD}public_html${RESET}  آپلود کن.`);
  console.log('');
  console.log(`  ۴) build بگیر و محتویات dist رو آپلود کن:`);
  console.log(`     ${CYAN}npm run build${RESET}`);
  console.log('');
  console.log(`  ۵) با همین رمز وارد پنل مدیریت بشو.`);
  console.log(`     بعداً می‌تونی از داخل پنل (تنظیمات) رمز رو تغییر بدی.`);
  console.log('');
  console.log(`${BOLD}${CYAN}${line()}${RESET}`);
  console.log('');
}

main().catch(err => {
  console.error(`\n${RED}خطا: ${err.message}${RESET}\n`);
  process.exit(1);
});
