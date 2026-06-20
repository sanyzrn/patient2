<?php
/**
 * Shared rate-limit helpers for the PHP backend.
 *
 * Usage:
 *   require_once __DIR__ . '/rate_limit.php';
 *   nafas_check_rate_limit(300);          // general per-day cap per IP
 *   nafas_login_throttle_check();         // before verifying a login password
 *   nafas_login_record_failure();         // after a wrong password
 *   nafas_login_reset();                  // after a correct password
 *
 * State is stored in the system temp dir (never the web root).
 */

/**
 * General per-day request cap per IP. Sends 429 JSON and exits on excess.
 */
function nafas_check_rate_limit(int $limit = 300): void {
    $ip    = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file  = sys_get_temp_dir() . '/nafas_rl_' . md5($ip) . '.json';
    $today = date('Y-m-d');

    $data = [];
    if (file_exists($file)) {
        $raw  = file_get_contents($file);
        $data = $raw !== false ? (json_decode($raw, true) ?: []) : [];
    }

    $count = $data[$today] ?? 0;

    if ($count >= $limit) {
        http_response_code(429);
        echo json_encode([
            'status'  => 'blocked',
            'error'   => 'rate_limit',
            'valid'   => false,
            'message' => 'محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.',
        ]);
        exit;
    }

    $data[$today] = $count + 1;
    file_put_contents($file, json_encode([$today => $data[$today]]), LOCK_EX);
}

/**
 * Path of the per-IP login-attempt file.
 */
function nafas_login_file(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return sys_get_temp_dir() . '/nafas_login_' . md5($ip) . '.json';
}

/**
 * Returns the failed-login timestamps for this IP that fall inside $window.
 */
function nafas_login_recent_attempts(int $window): array {
    $file = nafas_login_file();
    $now  = time();
    if (!file_exists($file)) {
        return [];
    }
    $raw  = file_get_contents($file);
    $data = $raw !== false ? (json_decode($raw, true) ?: []) : [];
    return array_values(array_filter(
        $data['attempts'] ?? [],
        static fn ($t) => ($now - (int) $t) < $window
    ));
}

/**
 * Blocks login when too many failed attempts happened recently.
 * Default: 10 failures per 15 minutes per IP.
 */
function nafas_login_throttle_check(int $max = 10, int $window = 900): void {
    if (count(nafas_login_recent_attempts($window)) >= $max) {
        http_response_code(429);
        echo json_encode([
            'valid' => false,
            'error' => 'تعداد تلاش‌های ناموفق زیاد است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.',
        ]);
        exit;
    }
}

/**
 * Records a failed login attempt for this IP.
 */
function nafas_login_record_failure(int $window = 900): void {
    $attempts   = nafas_login_recent_attempts($window);
    $attempts[] = time();
    file_put_contents(nafas_login_file(), json_encode(['attempts' => $attempts]), LOCK_EX);
}

/**
 * Clears the failed-login record for this IP (call after a correct password).
 */
function nafas_login_reset(): void {
    $file = nafas_login_file();
    if (file_exists($file)) {
        @unlink($file);
    }
}
