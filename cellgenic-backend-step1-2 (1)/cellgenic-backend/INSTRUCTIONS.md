# CellGenic Dashboard — Backend Setup Instructions
# For Ash to follow on WordPress / Hostinger

---

## STEP 1 — Install the CellGenic Roles Plugin

1. Log into WordPress admin
2. Go to Plugins → Add New → Upload Plugin
3. Upload the file: `cellgenic-roles.php`
4. Click Install Now → Activate

This creates two new user roles:
- Sales Representative
- Sales Manager

And sets up all the custom API endpoints the dashboard needs.

---

## STEP 2 — Install JWT Authentication Plugin

1. Go to Plugins → Add New
2. Search for: "JWT Authentication for WP REST API"
3. Install and Activate it

Then:

4. Open wp-config.php (via Hostinger File Manager or FTP)
5. Add these two lines ABOVE the line that says "/* That's all, stop editing! */":

```php
define('JWT_AUTH_SECRET_KEY', 'cellgenic-portal-secret-2026-make-this-longer-and-random');
define('JWT_AUTH_CORS_ENABLE', true);
```

Then:

6. Open .htaccess in the root of your WordPress install
7. Add these lines at the very top (above # BEGIN WordPress):

```
RewriteEngine on
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

---

## STEP 3 — Generate WooCommerce API Keys

1. Go to WooCommerce → Settings → Advanced → REST API
2. Click "Add Key"
3. Fill in:
   - Description: CellGenic Portal
   - User: (your admin user)
   - Permissions: Read/Write
4. Click "Generate API Key"
5. COPY both the Consumer Key and Consumer Secret immediately
   (you can only see them once)
6. Send these to Ankit securely

---

## STEP 4 — Set Up Rep User Accounts

For each sales rep:

1. Go to Users → Add New
2. Fill in name, email, username, password
3. Set Role to: "Sales Representative"
4. After creating, go to their profile
5. Scroll down and add a custom field:
   - Meta key: cellgenic_rep_code
   - Meta value: their code (e.g. JSANTOS, RKIM, MDIAZ)
6. Save

To add custom fields to user profiles, install:
"Advanced Custom Fields" or "User Meta Manager" plugin.

---

## STEP 5 — Test Everything

Test 1 — Rep code capture:
- Visit: your-site.com/become-a-provider/?rep=JSANTOS
- Register a test account
- Check that user in WordPress admin
- Confirm they have meta field: cellgenic_assigned_rep = JSANTOS

Test 2 — JWT login:
- Open browser console or Postman
- POST to: your-site.com/wp-json/jwt-auth/v1/token
- Body: { "username": "repusername", "password": "reppassword" }
- Should return a token

Test 3 — My clients endpoint:
- GET: your-site.com/wp-json/cellgenic/v1/my-clients
- Header: Authorization: Bearer {token from test 2}
- Should return list of clients assigned to that rep

Once all 3 tests pass — tell Ankit and he will connect the Next.js dashboard.

---

## Files Summary

| File | Where it goes |
|---|---|
| cellgenic-roles.php | WordPress → Plugins (upload and activate) |
| woocommerce.ts | Next.js project → src/lib/woocommerce.ts |
| auth.ts | Next.js project → src/lib/auth.ts |
| login-page.tsx | Next.js project → src/app/auth/login/page.tsx |
| .env.local.example | Next.js project root → rename to .env.local and fill in values |
