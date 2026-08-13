import { describe, expect, it } from 'vitest';
import { requireRole } from './travelogue.js';
import { AppError } from '../lib/errors.js';

describe('requireRole', () => {
  it('allows roles at or above the minimum', () => {
    expect(requireRole('owner', 'viewer')).toBe('owner');
    expect(requireRole('editor', 'editor')).toBe('editor');
    expect(requireRole('viewer', 'viewer')).toBe('viewer');
  });

  it('forbids insufficient roles', () => {
    expect(() => requireRole('viewer', 'editor')).toThrow(AppError);
    expect(() => requireRole(null, 'viewer')).toThrow(AppError);
  });
});
