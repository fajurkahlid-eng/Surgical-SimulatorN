
import type { ValidationResult } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export function validateEmail(value: string): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) return { valid: false, messageKey: 'validation.required' };
  if (trimmed.includes('@') && !EMAIL_REGEX.test(trimmed)) return { valid: false, messageKey: 'validation.invalidEmail' };
  return { valid: true };
}

export function validatePassword(value: string, requireMinLength = true): ValidationResult {
  if (!value || !value.trim()) return { valid: false, messageKey: 'validation.required' };
  if (requireMinLength && value.length < MIN_PASSWORD_LENGTH) return { valid: false, messageKey: 'validation.passwordShort' };
  return { valid: true };
}

export function validateRequired(value: string): ValidationResult {
  if (!value || !String(value).trim()) return { valid: false, messageKey: 'validation.required' };
  return { valid: true };
}
