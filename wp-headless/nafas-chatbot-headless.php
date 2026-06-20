<?php
/**
 * Plugin Name: Nafas Chatbot — Headless Bridge
 * Description: Lets the React portal use the Nafas Chatbot AJAX actions cross-origin.
 *              Adds CORS headers for the allowed portal origins and a public endpoint
 *              that hands the portal a fresh nonce. No other plugin changes are needed.
 * Version: 1.0.0
 *
 * ── INSTALL ────────────────────────────────────────────────────────────────
 * Copy this file to:  wp-content/mu-plugins/nafas-chatbot-headless.php
 * (create the mu-plugins folder if it does not exist — mu-plugins load automatically).
 * Then edit NAFAS_HEADLESS_ORIGINS below to list your portal domain(s).
 * ───────────────────────────────────────────────────────────────────────────
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Portal origins allowed to call the chatbot cross-origin.
 * Add your production portal domain here.
 */
define(
	'NAFAS_HEADLESS_ORIGINS',
	array(
		'https://patient.nafaspharmed.com',
		'http://localhost:5173',
		'http://localhost:3000',
	)
);

/**
 * The AJAX actions the portal is allowed to reach.
 */
function nafas_headless_actions() {
	return array(
		'nafas_chatbot_chat',
		'nafas_chatbot_submit',
		'nafas_chatbot_feedback',
		'nafas_chatbot_csat',
		'nafas_chatbot_suggest',
		'nafas_chatbot_nonce',
	);
}

/**
 * Echo CORS headers when the request comes from an allowed portal origin.
 */
function nafas_headless_send_cors() {
	$origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? trim( $_SERVER['HTTP_ORIGIN'] ) : '';
	if ( $origin && in_array( $origin, NAFAS_HEADLESS_ORIGINS, true ) ) {
		header( 'Access-Control-Allow-Origin: ' . $origin );
		header( 'Vary: Origin' );
		header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Content-Type' );
	}
}

/**
 * Attach CORS to our admin-ajax actions and answer the preflight (OPTIONS) request.
 */
add_action(
	'init',
	function () {
		if ( ! ( defined( 'DOING_AJAX' ) && DOING_AJAX ) ) {
			return;
		}
		$action = isset( $_REQUEST['action'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['action'] ) ) : '';
		if ( ! in_array( $action, nafas_headless_actions(), true ) ) {
			return;
		}
		nafas_headless_send_cors();
		if ( isset( $_SERVER['REQUEST_METHOD'] ) && 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
			status_header( 200 );
			exit;
		}
	},
	0
);

/**
 * Public endpoint: returns a fresh nonce for the chatbot AJAX calls.
 * GET/POST  admin-ajax.php?action=nafas_chatbot_nonce  →  { success: true, data: { nonce } }
 *
 * The nonce action string MUST match what the plugin verifies in its handlers
 * (the plugin localizes it as 'nafas_chatbot_nonce').
 */
function nafas_headless_nonce() {
	nafas_headless_send_cors();
	wp_send_json_success( array( 'nonce' => wp_create_nonce( 'nafas_chatbot_nonce' ) ) );
}
add_action( 'wp_ajax_nopriv_nafas_chatbot_nonce', 'nafas_headless_nonce' );
add_action( 'wp_ajax_nafas_chatbot_nonce', 'nafas_headless_nonce' );
