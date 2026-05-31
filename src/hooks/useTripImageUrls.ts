import { useState, useEffect } from 'react';
import { getImageObjectUrl } from '../db/tripImages';

export function useTripImageUrls(imageIds: string[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  const key = imageIds.join('\0');

  useEffect(() => {
    if (!imageIds.length) {
      setUrls([]);
      return;
    }

    let cancelled = false;

    Promise.all(imageIds.map((id) => getImageObjectUrl(id))).then((resolved) => {
      if (!cancelled) {
        setUrls(resolved.filter((url): url is string => url !== null));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key, imageIds]);

  return urls;
}
