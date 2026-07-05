// admin-space.js
// Wrapper for customer Space Admin Panel.
// Reads ?space= from URL and delegates to admin.js in customer-only mode.
// This file is loaded by admin-space.html ONLY — never by index.html.

// admin.js already handles the ?space= query param natively.
// We simply import it here so it runs with admin-space.html as the host.
import './admin.js';
