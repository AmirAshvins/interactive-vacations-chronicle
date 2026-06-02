const UUID_IN_URL =
  /\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(webp|jpe?g|png)$/i;

export function imageIdFromPublicUrl(url: string): string | null {
  const match = url.match(UUID_IN_URL);
  return match?.[1] ?? null;
}

export function imageIdsFromPublicUrls(urls: string[]): string[] {
  return urls.map(imageIdFromPublicUrl).filter((id): id is string => id !== null);
}

export function isServerImageId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
