/**
 * Password Validation Helper
 * 
 * Client-side validation for password strength (UX only).
 * Real enforcement happens in Supabase Dashboard.
 * 
 * Requirements:
 * - length >= 12
 * - includes uppercase letter
 * - includes lowercase letter
 * - includes number
 * - includes symbol
 */

export type PasswordValidation = {
  isValid: boolean;
  errors: string[];
  hints: string[];
};

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  const hints: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  } else {
    hints.push('✓ At least 12 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must include a lowercase letter');
  } else {
    hints.push('✓ Lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include an uppercase letter');
  } else {
    hints.push('✓ Uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must include a number');
  } else {
    hints.push('✓ Number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must include a symbol');
  } else {
    hints.push('✓ Symbol');
  }

  return {
    isValid: errors.length === 0,
    errors,
    hints,
  };
}
