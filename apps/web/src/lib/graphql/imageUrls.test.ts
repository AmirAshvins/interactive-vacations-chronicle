import { describe, expect, it } from 'vitest';
import { imageIdFromPublicUrl, imageIdsFromPublicUrls, isServerImageId } from './imageUrls';

describe('imageUrls', () => {
  it('extracts image UUID from public URLs', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(imageIdFromPublicUrl(`https://cdn.example.com/media/${id}.webp`)).toBe(id);
    expect(imageIdFromPublicUrl(`http://localhost:4000/storage/media/x/${id}.jpg`)).toBe(id);
    expect(imageIdFromPublicUrl('https://example.com/not-an-image.png')).toBeNull();
  });

  it('maps URL lists to image ids', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(imageIdsFromPublicUrls([`https://cdn.example.com/${id}.png`, 'bad'])).toEqual([id]);
  });

  it('validates server image ids', () => {
    expect(isServerImageId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isServerImageId('not-a-uuid')).toBe(false);
  });
});
