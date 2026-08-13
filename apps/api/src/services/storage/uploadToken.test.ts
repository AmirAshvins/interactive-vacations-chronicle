import { describe, expect, it } from 'vitest';
import { createUploadToken, verifyUploadToken } from './uploadToken.js';

describe('uploadToken', () => {
  it('creates and verifies a token for the same storage key', () => {
    const key = 'images/tg/trip/img.webp';
    const expiresAt = new Date(Date.now() + 60_000);
    const token = createUploadToken(key, expiresAt);

    expect(verifyUploadToken(token, key)).toBe(true);
  });

  it('rejects tampered or wrong-key tokens', () => {
    const key = 'images/tg/trip/img.webp';
    const token = createUploadToken(key, new Date(Date.now() + 60_000));

    expect(verifyUploadToken(token, 'images/other/key.webp')).toBe(false);
    const tampered = `${token.slice(0, -2)}aa`;
    expect(verifyUploadToken(tampered, key)).toBe(false);
  });

  it('rejects expired tokens', () => {
    const key = 'images/tg/trip/img.webp';
    const token = createUploadToken(key, new Date(Date.now() - 1_000));

    expect(verifyUploadToken(token, key)).toBe(false);
  });
});
