<?php
/**
 * NAFAS Admin Credential Manager (CLI only)
 *
 * Run this script to:
 * 1. Set/Change admin password
 * 2. View current credentials info
 * 3. Clear credentials / session tokens
 *
 * Usage: php public/admin-credentials-manager.php [command]
 *
 * SECURITY:
 * - Passwords are hashed with bcrypt (irreversible)
 * - Run this in a secure environment only (CLI only; HTTP access is forbidden)
 * - Secret state lives outside the web root, under ../storage
 */

const STORAGE_DIR = __DIR__ . '/../storage';
const CREDENTIALS_FILE = STORAGE_DIR . '/.admin-credentials.json';
const TOKENS_FILE = STORAGE_DIR . '/.admin-tokens.json';

// This tool is CLI-only. Any HTTP access is forbidden.
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
        echo "  reset               Clear credentials (reconfigure via env hash)\n";
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

function ensure_storage_dir() {
    if (!is_dir(STORAGE_DIR)) {
        mkdir(STORAGE_DIR, 0700, true);
    }
}

function set_password($password) {
    if (strlen($password) < 8) {
        echo "Error: Password must be at least 8 characters\n";
        exit(1);
    }

    $hashed = password_hash($password, PASSWORD_BCRYPT);
    $credentials = [
        'password'   => $hashed,
        'created_at' => date('Y-m-d H:i:s'),
        'note'       => 'Password set via CLI'
    ];

    ensure_storage_dir();
    file_put_contents(CREDENTIALS_FILE, json_encode($credentials, JSON_PRETTY_PRINT));
    chmod(CREDENTIALS_FILE, 0600);

    echo "✓ Password updated successfully\n";
}

function show_credentials() {
    if (!file_exists(CREDENTIALS_FILE)) {
        echo "No credentials file found\n";
        return;
    }

    $credentials = json_decode(file_get_contents(CREDENTIALS_FILE), true);
    echo "\n=== Current Credentials ===\n";
    echo "Created: " . ($credentials['created_at'] ?? 'Unknown') . "\n";
    echo "Note: " . ($credentials['note'] ?? 'None') . "\n";

    if (file_exists(TOKENS_FILE)) {
        $tokens = json_decode(file_get_contents(TOKENS_FILE), true);
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

function clear_tokens() {
    ensure_storage_dir();
    file_put_contents(TOKENS_FILE, json_encode([], JSON_PRETTY_PRINT));
    echo "✓ Tokens cleared\n";
}
