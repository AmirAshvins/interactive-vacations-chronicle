import { describe, expect, it } from 'vitest';
import {
  assertAllowedMime,
  buildStorageKey,
  mimeToExtension,
} from './index.js';

describe('storage helpers', () => {
  it('builds deterministic storage keys', () => {
    expect(
      buildStorageKey('tg-1', 'trip-1', 'img-1', 'image/webp'),
    ).toBe('images/tg-1/trip-1/img-1.webp');
  });

  it('maps mime types to extensions', () => {
    expect(mimeToExtension('image/jpeg')).toBe('jpg');
    expect(mimeToExtension('image/png')).toBe('png');
    expect(mimeToExtension('image/webp')).toBe('webp');
  });

  it('allows supported mime types only', () => {
    expect(() => assertAllowedMime('image/jpeg')).not.toThrow();
    expect(() => assertAllowedMime('image/gif')).toThrow(/Unsupported mime type/);
  });
});
