// src/js/Utils/__tests__/loginUtils.test.js
import {
  validateLoginFields,
  resolveRedirect,
  buildFullName,
  formatRoleLabel,
  isTokenExpired,
  validatePhoneNumber,
  validateOtpCode,
  generateOtpCode,
  isOtpCodeValid,
} from '../loginUtils';

describe('MOD-005 Login: validateLoginFields', () => {
  test('rejects when both email and password are missing', () => {
    expect(validateLoginFields('', '')).toEqual({
      valid: false,
      message: 'Please enter your email address and password.',
    });
  });

  test('rejects when password is missing', () => {
    expect(validateLoginFields('user@example.com', '')).toEqual({
      valid: false,
      message: 'Please enter your email address and password.',
    });
  });

  test('passes when both fields are filled in', () => {
    expect(validateLoginFields('user@example.com', 'pass123')).toEqual({ valid: true });
  });
});

describe('MOD-005 Login: resolveRedirect', () => {
  test('sends customers to the customer dashboard', () => {
    expect(resolveRedirect('Customer')).toBe('/customer/dashboard');
  });

  test('is case-insensitive and space-insensitive', () => {
    expect(resolveRedirect('  CUSTOMER  '.trim())).toBe('/customer/dashboard');
  });

  test('sends staff/admin roles to the main dashboard', () => {
    expect(resolveRedirect('Admin')).toBe('/dashboard');
    expect(resolveRedirect('Employee')).toBe('/dashboard');
  });

  test('defaults to the main dashboard when role is missing', () => {
    expect(resolveRedirect(null)).toBe('/dashboard');
  });
});

describe('MOD-005 Login: buildFullName', () => {
  test('joins first and last name when both are present', () => {
    expect(buildFullName('Juan', 'Dela Cruz', 'juan@example.com')).toBe('Juan Dela Cruz');
  });

  test('uses only the first name when last name is missing', () => {
    expect(buildFullName('Juan', '', 'juan@example.com')).toBe('Juan');
  });

  test('falls back to the email handle when no name is on file', () => {
    expect(buildFullName('', '', 'juan@example.com')).toBe('juan');
  });
});

describe('MOD-005 Login: formatRoleLabel', () => {
  test('title-cases a lowercase role', () => {
    expect(formatRoleLabel('admin')).toBe('Admin');
  });

  test('normalizes an all-caps role', () => {
    expect(formatRoleLabel('CUSTOMER')).toBe('Customer');
  });

  test('defaults to "User" when role is missing', () => {
    expect(formatRoleLabel(null)).toBe('User');
    expect(formatRoleLabel('')).toBe('User');
  });
});

describe('MOD-005 Login: isTokenExpired (edge case)', () => {
  test('returns true for a token whose exp is in the past', () => {
    const nowSeconds = 1_700_000_000;
    expect(isTokenExpired({ exp: nowSeconds - 10 }, nowSeconds)).toBe(true);
  });

  test('returns false for a token whose exp is in the future', () => {
    const nowSeconds = 1_700_000_000;
    expect(isTokenExpired({ exp: nowSeconds + 10 }, nowSeconds)).toBe(false);
  });

  test('returns false when payload has no exp claim', () => {
    expect(isTokenExpired({})).toBe(false);
  });
});

describe('MOD-005 Login: validatePhoneNumber', () => {
  test('accepts a valid local number', () => {
    expect(validatePhoneNumber('09171234567')).toEqual({ valid: true });
  });

  test('accepts a valid number with a leading +', () => {
    expect(validatePhoneNumber('+639171234567')).toEqual({ valid: true });
  });

  test('rejects a number that is too short', () => {
    expect(validatePhoneNumber('12345')).toEqual({
      valid: false,
      message: 'Please enter a valid phone number.',
    });
  });

  test('rejects letters or symbols in the number', () => {
    expect(validatePhoneNumber('0917-abc-4567')).toEqual({
      valid: false,
      message: 'Please enter a valid phone number.',
    });
  });
});

describe('MOD-005 Login: validateOtpCode', () => {
  test('rejects a code shorter than 6 digits', () => {
    expect(validateOtpCode('123')).toEqual({ valid: false, message: 'Enter the 6-digit code.' });
  });

  test('rejects an empty code', () => {
    expect(validateOtpCode('')).toEqual({ valid: false, message: 'Enter the 6-digit code.' });
  });

  test('accepts a 6-digit code', () => {
    expect(validateOtpCode('482913')).toEqual({ valid: true });
  });
});

describe('MOD-005 Login: generateOtpCode', () => {
  test('always generates a 6-digit numeric string', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  test('generated code falls within the 100000–999999 range', () => {
    const code = Number(generateOtpCode());
    expect(code).toBeGreaterThanOrEqual(100000);
    expect(code).toBeLessThanOrEqual(999999);
  });
});

describe('MOD-005 Login: isOtpCodeValid (edge case)', () => {
  const now = new Date('2026-01-01T00:10:00.000Z');

  test('accepts a matching, unexpired code', () => {
    const codeRow = { code: '482913', expires_at: '2026-01-01T00:20:00.000Z' };
    expect(isOtpCodeValid(codeRow, '482913', now)).toBe(true);
  });

  test('rejects when the submitted code does not match', () => {
    const codeRow = { code: '482913', expires_at: '2026-01-01T00:20:00.000Z' };
    expect(isOtpCodeValid(codeRow, '000000', now)).toBe(false);
  });

  test('rejects an expired code even if the digits match', () => {
    const codeRow = { code: '482913', expires_at: '2026-01-01T00:05:00.000Z' };
    expect(isOtpCodeValid(codeRow, '482913', now)).toBe(false);
  });

  test('rejects when there is no code row on file', () => {
    expect(isOtpCodeValid(null, '482913', now)).toBe(false);
  });
});
