<?php
/**
 * NAFAS Admin Credential Manager
 * 
 * Run this script to:
 * 1. Set/Change admin password
 * 2. View current credentials info
 * 3. Reset to defaults
 * 
 * Usage: php public/admin-credentials-manager.php
 * 
 * SECURITY:
 * - Passwords are hashed with bcrypt (irreversible)
 * - Run this in a secure environment only
 * - Delete this file after setting credentials
 */

const CREDENTIALS_FILE = __DIR__ . '/.admin-credentials.json';
const TOKENS_FILE = __DIR__ . '/.admin-tokens.json';

// CLI argument handling
if (php_sapi_name() === 'cli') {
    handle_cli();
} else {
    http_response_code(403);
    header('Content-Type: application/json');
    exit(json_encode(['error' => 'Forbidden']));
}

function handle_cli() {
    global $argv;
    
    if (!isset($argv[1])) {
        echo "=== NAFAS Admin Credential Manager ===\n\n";
        echo "Usage: php admin-credentials-manager.php [command]\n\n";
        echo "Commands:\n";
        echo "  set <password>      Set new admin password\n";
        echo "  show                Show current credentials info\n";
        echo "  reset               Reset to the initial admin password\n";
        echo "  clear-tokens        Clear all session tokens\n";
        echo "\n";
        exit(0);
    }
    
    $command = $argv[1];
    
    switch ($command) {
        case 'set':
            if (!isset($argv[2]) || strlen($argv[2]) < 8) {
                echo "Error: Password must be at least 8 characters\n";
                exit(1);
            }
            set_password($argv[2]);
            break;
            
        case 'show':
            show_credentials();
            break;
            
        case 'reset':
            reset_credentials();
            break;
            
        case 'clear-tokens':
            clear_tokens();
            break;
            
        default:
            echo "Unknown command: $command\n";
            exit(1);
    }
}

function display_web_interface() {
    ?>
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مدیریت اعتبارات مدیر نفس فارمد</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Vazirmatn', system-ui; background: #f8fafc; padding: 40px 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); padding: 32px; }
            h1 { color: #1a1a1a; margin-bottom: 8px; font-size: 24px; }
            .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
            .section { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
            .section:last-child { border-bottom: none; }
            .info-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; border-radius: 4px; font-size: 13px; color: #166534; margin-bottom: 16px; }
            .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; font-size: 13px; color: #92400e; margin-bottom: 16px; }
            label { display: block; color: #374151; font-weight: 600; margin-bottom: 8px; font-size: 13px; }
            input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
            input:focus { outline: none; border-color: #b61615; box-shadow: 0 0 0 3px rgba(182, 22, 21, 0.1); }
            button { width: 100%; padding: 10px 16px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            .btn-primary { background: #b61615; color: white; }
            .btn-primary:hover { background: #991211; }
            .btn-secondary { background: #e2e8f0; color: #374151; }
            .btn-secondary:hover { background: #cbd5e1; }
            .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .status { font-size: 12px; color: #666; margin-top: 8px; }
            .status.success { color: #22c55e; }
            .status.error { color: #ef4444; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 مدیریت رمز مدیر</h1>
            <p class="subtitle">سیستم احراز هویت نفس زیست فارمد</p>
            
            <div class="section">
                <div class="info-box">
                    ✓ رمز اولیهٔ مدیر تنظیم شده است<br>
                    ⚠️ توصیه می‌شود رمز را از پنل مدیریت تغییر دهید
                </div>
                
                <h3 style="color: #1a1a1a; margin-bottom: 12px; font-size: 16px;">تنظیم رمز عبور جدید</h3>
                <form id="setPasswordForm">
                    <label for="newPassword">رمز عبور جدید (حداقل 8 کاراکتر)</label>
                    <input 
                        id="newPassword" 
                        type="password" 
                        placeholder="رمز عبور جدید را وارد کنید"
                        minlength="8"
                        required
                    />
                    <button type="submit" class="btn-primary" style="margin-top: 12px;">ذخیره رمز</button>
                    <div id="passwordStatus" class="status"></div>
                </form>
            </div>
            
            <div class="section">
                <h3 style="color: #1a1a1a; margin-bottom: 12px; font-size: 16px;">اقدامات دیگر</h3>
                <div class="btn-group">
                    <button class="btn-secondary" onclick="resetToDefault()">بازنشانی</button>
                    <button class="btn-secondary" onclick="clearTokens()">حذف جلسات</button>
                </div>
            </div>
            
            <div class="section" id="infoSection">
                <h3 style="color: #1a1a1a; margin-bottom: 12px; font-size: 16px;">اطلاعات</h3>
                <div id="credentialsInfo" style="font-size: 12px; color: #666; line-height: 1.6;"></div>
            </div>
        </div>
        
        <script>
            document.getElementById('setPasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = document.getElementById('newPassword').value;
                const statusEl = document.getElementById('passwordStatus');
                
                try {
                    const response = await fetch(window.location.href, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'set_password', password })
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        statusEl.textContent = '✓ رمز با موفقیت ذخیره شد';
                        statusEl.className = 'status success';
                        document.getElementById('newPassword').value = '';
                        loadInfo();
                    } else {
                        statusEl.textContent = '✗ خطا: ' + (data.error || 'خطای نامشخص');
                        statusEl.className = 'status error';
                    }
                } catch (err) {
                    statusEl.textContent = '✗ خطا: ' + err.message;
                    statusEl.className = 'status error';
                }
            });
            
            async function resetToDefault() {
                if (confirm('آیا مطمئن هستید؟ این کار رمز را به حالت پیش‌فرض بازخواهد گذاشت.')) {
                    try {
                        const response = await fetch(window.location.href, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'reset' })
                        });
                        const data = await response.json();
                        if (data.success) {
                            alert('✓ بازنشانی کامل شد. رمز اولیهٔ مدیر بازگردانی شد.');
                            loadInfo();
                        } else {
                            alert('✗ خطا: ' + (data.error || 'خطای نامشخص'));
                        }
                    } catch (err) {
                        alert('✗ خطا: ' + err.message);
                    }
                }
            }
            
            async function clearTokens() {
                if (confirm('آیا تمام جلسات فعال را حذف کنید؟')) {
                    try {
                        const response = await fetch(window.location.href, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'clear_tokens' })
                        });
                        const data = await response.json();
                        if (data.success) {
                            alert('✓ جلسات حذف شدند');
                        }
                    } catch (err) {
                        alert('✗ خطا: ' + err.message);
                    }
                }
            }
            
            async function loadInfo() {
                try {
                    const response = await fetch(window.location.href, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'get_info' })
                    });
                    const data = await response.json();
                    
                    const infoEl = document.getElementById('credentialsInfo');
                    if (data.credentials) {
                        const c = data.credentials;
                        infoEl.innerHTML = `
                            تاریخ ایجاد: ${c.created_at || 'نامشخص'}<br>
                            وضعیت: ${c.note || 'تنظیم‌شده'}<br>
                            جلسات فعال: ${data.active_tokens || 0}
                        `;
                    }
                } catch (err) {
                    console.error('Error loading info:', err);
                }
            }
            
            // Load info on page load
            loadInfo();
        </script>
    </body>
    </html>
    <?php
}

// Handle POST requests for web interface
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['action'])) {
        exit(json_encode(['error' => 'Action required']));
    }
    
    switch ($data['action']) {
        case 'set_password':
            if (!isset($data['password']) || strlen($data['password']) < 8) {
                exit(json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']));
            }
            set_password_web($data['password']);
            break;
            
        case 'reset':
            reset_credentials_web();
            break;
            
        case 'clear_tokens':
            clear_tokens_web();
            break;
            
        case 'get_info':
            get_info_web();
            break;
    }
    exit;
}

function set_password($password) {
    global $CREDENTIALS_FILE;
    
    if (strlen($password) < 8) {
        echo "Error: Password must be at least 8 characters\n";
        exit(1);
    }
    
    $hashed = password_hash($password, PASSWORD_BCRYPT);
    $credentials = [
        'password' => $hashed,
        'created_at' => date('Y-m-d H:i:s'),
        'note' => 'Password set via CLI'
    ];
    
    file_put_contents($CREDENTIALS_FILE, json_encode($credentials, JSON_PRETTY_PRINT));
    chmod($CREDENTIALS_FILE, 0600);
    
    echo "✓ Password updated successfully\n";
}

function set_password_web($password) {
    global $CREDENTIALS_FILE;
    
    if (strlen($password) < 8) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']));
    }
    
    $hashed = password_hash($password, PASSWORD_BCRYPT);
    $credentials = [
        'password' => $hashed,
        'created_at' => date('Y-m-d H:i:s'),
        'note' => 'Password updated from web interface'
    ];
    
    file_put_contents($CREDENTIALS_FILE, json_encode($credentials, JSON_PRETTY_PRINT));
    chmod($CREDENTIALS_FILE, 0600);
    
    exit(json_encode(['success' => true]));
}

function show_credentials() {
    global $CREDENTIALS_FILE, $TOKENS_FILE;
    
    if (!file_exists($CREDENTIALS_FILE)) {
        echo "No credentials file found\n";
        return;
    }
    
    $credentials = json_decode(file_get_contents($CREDENTIALS_FILE), true);
    echo "\n=== Current Credentials ===\n";
    echo "Created: " . ($credentials['created_at'] ?? 'Unknown') . "\n";
    echo "Note: " . ($credentials['note'] ?? 'None') . "\n";
    
    if (file_exists($TOKENS_FILE)) {
        $tokens = json_decode(file_get_contents($TOKENS_FILE), true);
        echo "\nActive Tokens: " . count($tokens) . "\n";
    }
    
    echo "\n";
}

function reset_credentials() {
    if (file_exists(CREDENTIALS_FILE)) {
        unlink(CREDENTIALS_FILE);
    }
    echo "✓ Credentials cleared. Reconfigure with NAFAS_ADMIN_PASSWORD_HASH.\n";
}

function reset_credentials_web() {
    if (file_exists(CREDENTIALS_FILE)) {
        unlink(CREDENTIALS_FILE);
    }
    exit(json_encode(['success' => true]));
}

function clear_tokens() {
    global $TOKENS_FILE;
    file_put_contents($TOKENS_FILE, json_encode([], JSON_PRETTY_PRINT));
    echo "✓ Tokens cleared\n";
}

function clear_tokens_web() {
    global $TOKENS_FILE;
    file_put_contents($TOKENS_FILE, json_encode([], JSON_PRETTY_PRINT));
    exit(json_encode(['success' => true]));
}

function get_info_web() {
    global $CREDENTIALS_FILE, $TOKENS_FILE;
    
    $credentials = null;
    if (file_exists($CREDENTIALS_FILE)) {
        $credentials = json_decode(file_get_contents($CREDENTIALS_FILE), true);
    }
    
    $active_tokens = 0;
    if (file_exists($TOKENS_FILE)) {
        $tokens = json_decode(file_get_contents($TOKENS_FILE), true);
        $current_time = time();
        $active_tokens = count(array_filter($tokens, function($t) use ($current_time) {
            return ($current_time - $t['created_at']) < 86400;
        }));
    }
    
    exit(json_encode([
        'credentials' => $credentials,
        'active_tokens' => $active_tokens
    ]));
}
?>
