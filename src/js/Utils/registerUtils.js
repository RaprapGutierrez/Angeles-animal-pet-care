// src/js/Utils/registerUtils.js
// Pure business-logic functions for the Registration module (MOD-006).
// Extracted from src/pages/Login-Register/Register.jsx so they can be unit
// tested independently of the React UI and Supabase.

/**
 * Strip anything that isn't a letter, space, apostrophe, or hyphen from a
 * name field as the user types.
 * Mirrors: const sanitizeName = (v) => v.replace(/[^a-zA-Z\s'-]/g, '');
 * @param {string} value
 * @returns {string}
 */
export function sanitizeName(value) {
  return (value || '').replace(/[^a-zA-Z\s'-]/g, '');
}

/**
 * Strip non-digits and cap a phone number at 11 characters as the user types.
 * Mirrors: const sanitizePhone = (v) => v.replace(/[^0-9]/g, '').slice(0, 11);
 * @param {string} value
 * @returns {string}
 */
export function sanitizePhone(value) {
  return (value || '').replace(/[^0-9]/g, '').slice(0, 11);
}

/**
 * Step 1 validation: name fields present and an 11-digit contact number.
 * Mirrors the step === 1 branch of handleNextStep() in Register.jsx.
 * @param {{firstName: string, lastName: string, phoneNumber: string}} fields
 * @returns {{valid: boolean, message?: string}}
 */
export function validateStep1(fields) {
  const { firstName, lastName, phoneNumber } = fields || {};
  if (!firstName || !lastName || !phoneNumber) {
    return { valid: false, message: 'Please fill in your first name, last name, and contact number.' };
  }
  if (!/^[0-9]{11}$/.test(phoneNumber)) {
    return { valid: false, message: 'Please Enter an 11-digit contact number.' };
  }
  return { valid: true };
}

/**
 * Step 2 validation: a branch must be selected.
 * Mirrors the step === 2 branch of handleNextStep() in Register.jsx.
 * @param {string|number} branchId
 * @returns {{valid: boolean, message?: string}}
 */
export function validateStep2(branchId) {
  if (!branchId) {
    return { valid: false, message: 'Please select your preferred branch.' };
  }
  return { valid: true };
}

/**
 * Step 3 validation: a syntactically valid email address.
 * Mirrors the step === 3 branch of handleNextStep() in Register.jsx.
 * @param {string} email
 * @returns {{valid: boolean, message?: string}}
 */
export function validateStep3(email) {
  if (!email) {
    return { valid: false, message: 'Please enter your email address.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }
  return { valid: true };
}

/**
 * Score a password's strength and return a label/color/bar-width for the
 * strength meter. Returns null for an empty password (meter is hidden).
 * Mirrors: passwordStrength() in Register.jsx.
 * @param {string} password
 * @returns {{label: string, color: string, width: string, score: number}|null}
 */
export function passwordStrength(password) {
  if (!password) return null;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const score = [password.length >= 8, hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
  if (score <= 1) return { label: 'Too weak — add uppercase, numbers & symbols', color: '#dc2626', width: '20%', score };
  if (score === 2) return { label: 'Weak — needs more variety', color: '#f97316', width: '40%', score };
  if (score === 3) return { label: 'Fair — add symbols or uppercase', color: '#f59e0b', width: '60%', score };
  if (score === 4) return { label: 'Good — almost there!', color: '#84cc16', width: '80%', score };
  return { label: 'Strong password ✓', color: '#16a34a', width: '100%', score };
}

/**
 * Full final-submit validation, mirroring the guard clauses at the top of
 * handleRegister() in Register.jsx — required fields, branch, and the four
 * password rules, in the same order they're checked in the UI.
 * @param {{firstName, lastName, email, password, confirmPassword, branchId}} form
 * @returns {{valid: boolean, message?: string, title?: string}}
 */
export function validateRegistration(form) {
  const { firstName, lastName, email, password, confirmPassword, branchId } = form || {};

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return { valid: false, title: 'Missing Fields', message: 'Please fill in all required fields.' };
  }
  if (!branchId) {
    return { valid: false, title: 'Missing Branch', message: 'Please go back and select your preferred branch.' };
  }
  if (password.length < 8) {
    return { valid: false, title: 'Weak Password', message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, title: 'Weak Password', message: 'Password must contain at least one uppercase letter (A–Z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, title: 'Weak Password', message: 'Password must contain at least one number (0–9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, title: 'Weak Password', message: 'Password must contain at least one symbol (e.g. @, #, !, $).' };
  }
  if (password !== confirmPassword) {
    return { valid: false, title: 'Password Mismatch', message: 'Passwords do not match. Please try again.' };
  }
  return { valid: true };
}
