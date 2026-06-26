<?php
/**
 * Plugin Name: CellGenic Sales Roles
 * Description: Adds Sales Rep and Sales Manager roles, and handles rep code assignment at provider registration.
 * Version: 1.0.0
 * Author: CellGenic
 */

if (!defined('ABSPATH')) exit;

// ─────────────────────────────────────────────
// 1. CREATE CUSTOM ROLES ON PLUGIN ACTIVATION
// ─────────────────────────────────────────────
register_activation_hook(__FILE__, 'cellgenic_create_roles');

function cellgenic_create_roles() {
    // Sales Representative
    add_role('sales_rep', 'Sales Representative', [
        'read'         => true,
        'edit_posts'   => false,
        'delete_posts' => false,
    ]);

    // Sales Manager
    add_role('sales_manager', 'Sales Manager', [
        'read'         => true,
        'edit_posts'   => false,
        'delete_posts' => false,
    ]);
}

// Remove roles on plugin deactivation
register_deactivation_hook(__FILE__, 'cellgenic_remove_roles');

function cellgenic_remove_roles() {
    remove_role('sales_rep');
    remove_role('sales_manager');
}


// ─────────────────────────────────────────────
// 2. CAPTURE ?rep=CODE FROM URL AT REGISTRATION
// ─────────────────────────────────────────────

// Store the rep code in a cookie when the page loads with ?rep=CODE
add_action('init', 'cellgenic_capture_rep_code');

function cellgenic_capture_rep_code() {
    if (!empty($_GET['rep'])) {
        $rep_code = sanitize_text_field($_GET['rep']);
        // Store in cookie for 7 days so it survives multi-step forms
        setcookie('cellgenic_rep_code', $rep_code, time() + (7 * DAY_IN_SECONDS), COOKIEPATH, COOKIE_DOMAIN);
        // Also store in session via transient as backup
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['cellgenic_rep_code'] = $rep_code;
    }
}

// When a new user registers, save the rep code to their user meta
add_action('user_register', 'cellgenic_save_rep_code_on_register');

function cellgenic_save_rep_code_on_register($user_id) {
    $rep_code = '';

    // Try cookie first
    if (!empty($_COOKIE['cellgenic_rep_code'])) {
        $rep_code = sanitize_text_field($_COOKIE['cellgenic_rep_code']);
    }

    // Try session as fallback
    if (empty($rep_code)) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        if (!empty($_SESSION['cellgenic_rep_code'])) {
            $rep_code = sanitize_text_field($_SESSION['cellgenic_rep_code']);
        }
    }

    // Try POST data as last fallback (if form passes it as hidden field)
    if (empty($rep_code) && !empty($_POST['rep_code'])) {
        $rep_code = sanitize_text_field($_POST['rep_code']);
    }

    if (!empty($rep_code)) {
        update_user_meta($user_id, 'cellgenic_assigned_rep', $rep_code);
        // Clear the cookie
        setcookie('cellgenic_rep_code', '', time() - 3600, COOKIEPATH, COOKIE_DOMAIN);
    }
}


// ─────────────────────────────────────────────
// 3. HIDDEN FIELD IN REGISTRATION FORM (BACKUP)
// ─────────────────────────────────────────────
// Adds a hidden rep_code field to WooCommerce registration form
add_action('woocommerce_register_form', 'cellgenic_add_rep_hidden_field');

function cellgenic_add_rep_hidden_field() {
    $rep_code = '';
    if (!empty($_COOKIE['cellgenic_rep_code'])) {
        $rep_code = sanitize_text_field($_COOKIE['cellgenic_rep_code']);
    }
    if (!empty($rep_code)) {
        echo '<input type="hidden" name="rep_code" value="' . esc_attr($rep_code) . '">';
    }
}


// ─────────────────────────────────────────────
// 4. REST API ENDPOINTS FOR THE DASHBOARD
// ─────────────────────────────────────────────
add_action('rest_api_init', 'cellgenic_register_api_routes');

function cellgenic_register_api_routes() {

    // GET /wp-json/cellgenic/v1/my-clients
    // Returns all providers assigned to the current rep
    register_rest_route('cellgenic/v1', '/my-clients', [
        'methods'             => 'GET',
        'callback'            => 'cellgenic_get_my_clients',
        'permission_callback' => 'cellgenic_is_sales_rep',
    ]);

    // GET /wp-json/cellgenic/v1/all-clients
    // Returns all providers (manager/admin only)
    register_rest_route('cellgenic/v1', '/all-clients', [
        'methods'             => 'GET',
        'callback'            => 'cellgenic_get_all_clients',
        'permission_callback' => 'cellgenic_is_manager_or_admin',
    ]);

    // GET /wp-json/cellgenic/v1/pending-providers
    // Returns users pending provider approval
    register_rest_route('cellgenic/v1', '/pending-providers', [
        'methods'             => 'GET',
        'callback'            => 'cellgenic_get_pending_providers',
        'permission_callback' => 'cellgenic_is_manager_or_admin',
    ]);

    // POST /wp-json/cellgenic/v1/approve-provider
    // Approves a provider application
    register_rest_route('cellgenic/v1', '/approve-provider', [
        'methods'             => 'POST',
        'callback'            => 'cellgenic_approve_provider',
        'permission_callback' => 'cellgenic_is_manager_or_admin',
    ]);

    // POST /wp-json/cellgenic/v1/reject-provider
    // Rejects a provider application
    register_rest_route('cellgenic/v1', '/reject-provider', [
        'methods'             => 'POST',
        'callback'            => 'cellgenic_reject_provider',
        'permission_callback' => 'cellgenic_is_manager_or_admin',
    ]);

    // GET /wp-json/cellgenic/v1/reps
    // Returns all sales reps with basic stats
    register_rest_route('cellgenic/v1', '/reps', [
        'methods'             => 'GET',
        'callback'            => 'cellgenic_get_reps',
        'permission_callback' => 'cellgenic_is_manager_or_admin',
    ]);

    // POST /wp-json/cellgenic/v1/assign-client
    // Assigns an unassigned provider to a rep
    register_rest_route('cellgenic/v1', '/assign-client', [
        'methods'             => 'POST',
        'callback'            => 'cellgenic_assign_client',
        'permission_callback' => 'cellgenic_is_manager_or_admin',
    ]);
}


// ─────────────────────────────────────────────
// 5. API PERMISSION CALLBACKS
// ─────────────────────────────────────────────
function cellgenic_is_sales_rep() {
    $user = wp_get_current_user();
    return in_array('sales_rep', $user->roles) || in_array('sales_manager', $user->roles) || in_array('administrator', $user->roles);
}

function cellgenic_is_manager_or_admin() {
    $user = wp_get_current_user();
    return in_array('sales_manager', $user->roles) || in_array('administrator', $user->roles);
}


// ─────────────────────────────────────────────
// 6. API CALLBACK FUNCTIONS
// ─────────────────────────────────────────────

function cellgenic_get_my_clients() {
    $current_user = wp_get_current_user();
    $rep_code = get_user_meta($current_user->ID, 'cellgenic_rep_code', true);

    if (empty($rep_code)) {
        return new WP_Error('no_rep_code', 'No rep code assigned to this user.', ['status' => 400]);
    }

    $users = get_users([
        'meta_key'   => 'cellgenic_assigned_rep',
        'meta_value' => $rep_code,
        'role'       => 'cellgenic_provider',
    ]);

    return cellgenic_format_clients($users);
}

function cellgenic_get_all_clients() {
    $users = get_users(['role' => 'cellgenic_provider']);
    return cellgenic_format_clients($users);
}

function cellgenic_format_clients($users) {
    $clients = [];
    foreach ($users as $user) {
        $assigned_rep = get_user_meta($user->ID, 'cellgenic_assigned_rep', true);

        // Get last order
        $orders = wc_get_orders([
            'customer' => $user->ID,
            'limit'    => 1,
            'orderby'  => 'date',
            'order'    => 'DESC',
            'status'   => ['wc-completed', 'wc-processing'],
        ]);

        $last_order_date = null;
        $days_since      = null;
        if (!empty($orders)) {
            $last_order_date = $orders[0]->get_date_created()->date('M j, Y');
            $days_since      = (int) floor((time() - $orders[0]->get_date_created()->getTimestamp()) / DAY_IN_SECONDS);
        }

        $total_orders = wc_get_customer_order_count($user->ID);

        $clients[] = [
            'id'           => $user->ID,
            'name'         => $user->display_name,
            'email'        => $user->user_email,
            'clinic'       => get_user_meta($user->ID, 'clinic_name', true),
            'country'      => get_user_meta($user->ID, 'billing_country', true),
            'assigned_rep' => $assigned_rep,
            'last_order'   => $last_order_date,
            'days_since'   => $days_since,
            'total_orders' => $total_orders,
            'at_risk'      => $days_since !== null && $days_since >= 30,
        ];
    }
    return $clients;
}

function cellgenic_get_pending_providers() {
    $users = get_users([
        'meta_key'   => 'cellgenic_provider_status',
        'meta_value' => 'pending',
    ]);

    $providers = [];
    foreach ($users as $user) {
        $providers[] = [
            'id'          => $user->ID,
            'name'        => $user->display_name,
            'email'       => $user->user_email,
            'clinic'      => get_user_meta($user->ID, 'clinic_name', true),
            'country'     => get_user_meta($user->ID, 'billing_country', true),
            'license'     => get_user_meta($user->ID, 'medical_license', true),
            'specialty'   => get_user_meta($user->ID, 'specialty', true),
            'submitted'   => get_user_meta($user->ID, 'provider_submitted_date', true),
        ];
    }
    return $providers;
}

function cellgenic_approve_provider(WP_REST_Request $request) {
    $user_id = (int) $request->get_param('user_id');
    if (!$user_id) return new WP_Error('missing_user_id', 'user_id is required.', ['status' => 400]);

    $user = new WP_User($user_id);
    $user->set_role('cellgenic_provider');
    update_user_meta($user_id, 'cellgenic_provider_status', 'approved');

    // Send approval email
    wp_mail(
        $user->user_email,
        'Your CellGenic Provider Account Has Been Approved',
        "Hi {$user->display_name},\n\nYour provider account has been approved. You can now log in to view pricing and place orders.\n\nhttps://cellgenic.com/my-account/\n\nWelcome to CellGenic."
    );

    return ['success' => true, 'message' => 'Provider approved and notified.'];
}

function cellgenic_reject_provider(WP_REST_Request $request) {
    $user_id = (int) $request->get_param('user_id');
    if (!$user_id) return new WP_Error('missing_user_id', 'user_id is required.', ['status' => 400]);

    $user = new WP_User($user_id);
    update_user_meta($user_id, 'cellgenic_provider_status', 'rejected');

    // Send rejection email
    wp_mail(
        $user->user_email,
        'CellGenic Provider Application Update',
        "Hi {$user->display_name},\n\nThank you for applying to become a CellGenic provider. After reviewing your application, we are unable to approve your account at this time.\n\nIf you believe this is an error or would like more information, please contact us.\n\nRegards,\nThe CellGenic Team"
    );

    return ['success' => true, 'message' => 'Provider rejected and notified.'];
}

function cellgenic_get_reps() {
    $reps = get_users(['role' => 'sales_rep']);
    $result = [];

    foreach ($reps as $rep) {
        $rep_code = get_user_meta($rep->ID, 'cellgenic_rep_code', true);

        // Count clients assigned to this rep
        $clients = get_users([
            'meta_key'   => 'cellgenic_assigned_rep',
            'meta_value' => $rep_code,
            'role'       => 'cellgenic_provider',
            'count_total' => true,
        ]);

        $result[] = [
            'id'       => $rep->ID,
            'name'     => $rep->display_name,
            'email'    => $rep->user_email,
            'rep_code' => $rep_code,
            'clients'  => count($clients),
        ];
    }

    return $result;
}

function cellgenic_assign_client(WP_REST_Request $request) {
    $user_id  = (int) $request->get_param('user_id');
    $rep_code = sanitize_text_field($request->get_param('rep_code'));

    if (!$user_id || !$rep_code) {
        return new WP_Error('missing_params', 'user_id and rep_code are required.', ['status' => 400]);
    }

    update_user_meta($user_id, 'cellgenic_assigned_rep', $rep_code);
    return ['success' => true, 'message' => 'Client assigned to rep.'];
}


// ─────────────────────────────────────────────
// 7. DAILY CRON — 30-DAY ALERT EMAILS TO REPS
// ─────────────────────────────────────────────
register_activation_hook(__FILE__, 'cellgenic_schedule_cron');

function cellgenic_schedule_cron() {
    if (!wp_next_scheduled('cellgenic_daily_alert_check')) {
        wp_schedule_event(time(), 'daily', 'cellgenic_daily_alert_check');
    }
}

register_deactivation_hook(__FILE__, 'cellgenic_clear_cron');

function cellgenic_clear_cron() {
    wp_clear_scheduled_hook('cellgenic_daily_alert_check');
}

add_action('cellgenic_daily_alert_check', 'cellgenic_send_activity_alerts');

function cellgenic_send_activity_alerts() {
    $providers = get_users(['role' => 'cellgenic_provider']);

    // Group at-risk providers by their assigned rep
    $alerts_by_rep = [];

    foreach ($providers as $provider) {
        $orders = wc_get_orders([
            'customer' => $provider->ID,
            'limit'    => 1,
            'orderby'  => 'date',
            'order'    => 'DESC',
            'status'   => ['wc-completed', 'wc-processing'],
        ]);

        if (empty($orders)) continue;

        $days_since = (int) floor((time() - $orders[0]->get_date_created()->getTimestamp()) / DAY_IN_SECONDS);

        if ($days_since >= 30) {
            $rep_code = get_user_meta($provider->ID, 'cellgenic_assigned_rep', true);
            if (!empty($rep_code)) {
                $alerts_by_rep[$rep_code][] = [
                    'name'       => $provider->display_name,
                    'clinic'     => get_user_meta($provider->ID, 'clinic_name', true),
                    'days_since' => $days_since,
                ];
            }
        }
    }

    // Send one email per rep with all their at-risk clients
    foreach ($alerts_by_rep as $rep_code => $at_risk_clients) {
        $reps = get_users([
            'meta_key'   => 'cellgenic_rep_code',
            'meta_value' => $rep_code,
            'role'       => 'sales_rep',
        ]);

        if (empty($reps)) continue;

        $rep = $reps[0];
        $client_list = '';
        foreach ($at_risk_clients as $client) {
            $client_list .= "• {$client['name']} ({$client['clinic']}) — {$client['days_since']} days since last order\n";
        }

        wp_mail(
            $rep->user_email,
            'CellGenic — Clients Due for Follow-Up',
            "Hi {$rep->display_name},\n\nThe following clients have not placed an order in 30 or more days and may need a follow-up:\n\n{$client_list}\nLog in to your dashboard to take action:\nhttps://portal.cellgenic.com\n\nCellGenic Sales Team"
        );
    }
}
