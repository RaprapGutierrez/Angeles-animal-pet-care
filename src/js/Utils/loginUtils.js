// src/js/Utils/loginUtils.js
// Pure business-logic functions for the Login & Authentication module (MOD-005).
// Extracted from src/pages/Login-Register/Login.jsx so they can be unit
// tested independently of the React UI, Supabase, and localStorage.

/**
 * Validate that both login fields were filled in before calling Supabase.
 * Mirrors: if (!email || !password) { ...warning... }
 * @param {string} email
 * @param {string} password
 * @returns {{valid: boolean, message?: string}}
 */
export function validateLoginFields(email, password) {
  if (!email || !password) {
    return { valid: false, message: 'Please enter your email address and password.' };
  }
  return { valid: true };
}

/**
 * Decide which route to send a user to after login, based on role.
 * Mirrors: resolveRedirect() in Login.jsx.
 * @param {string} role
 * @returns {string} route path
 */
export function resolveRedirect(role) {
  const r = (role || '').toLowerCase().replace(/\s+/g, '_');
  if (r === 'customer') return '/customer/dashboard';
  return '/dashboard';
}

/**
 * Build a display name from profile fields, falling back to the email
 * handle when no first/last name is on file.
 * Mirrors: const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} email
 * @returns {string}
 */
export function buildFullName(firstName, lastName, email) {
  const joined = [firstName, lastName].filter(Boolean).join(' ');
  if (joined) return joined;
  return (email || '').split('@')[0];
}

/**
 * Title-case a role for display in the welcome popup, defaulting to "User".
 * Mirrors: role?.charAt(0).toUpperCase() + role?.slice(1).toLowerCase() || "User"
 * @param {string} role
 * @returns {string}
 */
export function formatRoleLabel(role) {
  if (!role) return 'User';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

/**
 * Whether a decoded JWT payload is expired, given the current time.
 * Mirrors the expiry check inside getRole() in Login.jsx.
 * @param {{exp?: number}} payload - decoded JWT payload
 * @param {number} nowSeconds - current time in epoch seconds
 * @returns {boolean}
 */
export function isTokenExpired(payload, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!payload || !payload.exp) return false;
  return payload.exp < nowSeconds;
}

/**
 * Validate a phone number before saving it and sending a 2FA code.
 * Mirrors: if (!/^\+?[0-9]{10,15}$/.test(cleaned)) { ...error... }
 * @param {string} phone
 * @returns {{valid: boolean, message?: string}}
 */
export function validatePhoneNumber(phone) {
  const cleaned = (phone || '').trim();
  if (!/^\+?[0-9]{10,15}$/.test(cleaned)) {
    return { valid: false, message: 'Please enter a valid phone number.' };
  }
  return { valid: true };
}

/**
 * Validate a submitted 2FA code is the right length before checking it
 * against the stored code.
 * Mirrors: if (otpValue.length !== 6) { ...error... }
 * @param {string} otp
 * @returns {{valid: boolean, message?: string}}
 */
export function validateOtpCode(otp) {
  if (!otp || otp.length !== 6) {
    return { valid: false, message: 'Enter the 6-digit code.' };
  }
  return { valid: true };
}

/**
 * Generate a random 6-digit numeric OTP code as a string (zero-padded).
 * Mirrors: generateOtpCode() in Login.jsx.
 * @returns {string}
 */
export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Whether a stored 2FA code row still matches and hasn't expired.
 * Mirrors the guard in handleOtpSubmit(): fetchErr || !codeRow ||
 * codeRow.code !== otpValue || new Date(codeRow.expires_at) < new Date()
 * @param {{code: string, expires_at: string}|null} codeRow
 * @param {string} submittedOtp
 * @param {Date} now
 * @returns {boolean}
 */
export function isOtpCodeValid(codeRow, submittedOtp, now = new Date()) {
  if (!codeRow) return false;
  if (codeRow.code !== submittedOtp) return false;
  if (new Date(codeRow.expires_at) < now) return false;
  return true;
}
