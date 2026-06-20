// Central config for API URLs.
// Set VITE_API_BASE_URL in .env to configure the deploy base path.
const BASE = import.meta.env.VITE_API_BASE_URL ?? '.';

export const API_URL = `${BASE}/api.php`;

// Headless chatbot: the WordPress site that runs the Nafas Chatbot plugin.
// The React portal calls its admin-ajax endpoints (AI + submissions + notifications).
const WP_BASE = import.meta.env.VITE_WP_BASE_URL ?? 'https://nafaspharmed.com';
export const WP_AJAX_URL = `${WP_BASE}/wp-admin/admin-ajax.php`;
