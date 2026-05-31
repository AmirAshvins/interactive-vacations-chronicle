import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  isDarkPhase?: boolean;
  compact?: boolean;
}

export default function ImageCarousel({
  images,
  alt,
  isDarkPhase = false,
  compact = false,
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);

  if (!images.length) return null;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i + 1) % images.length);
  };

  const heightClass = compact ? 'h-28' : 'h-36';

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${heightClass} ${
        isDarkPhase ? 'bg-black/30' : 'bg-black/5'
      }`}
    >
      <div
        className="flex h-full transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={`${src.slice(0, 32)}-${i}`}
            src={src}
            alt={`${alt} ${i + 1}`}
            className="h-full w-full shrink-0 object-cover"
            draggable={false}
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className={`absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
              isDarkPhase
                ? 'bg-black/50 text-white hover:bg-black/70'
                : 'bg-white/80 text-neutral-700 hover:bg-white'
            }`}
            aria-label="Previous photo"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goNext}
            className={`absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
              isDarkPhase
                ? 'bg-black/50 text-white hover:bg-black/70'
                : 'bg-white/80 text-neutral-700 hover:bg-white'
            }`}
            aria-label="Next photo"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-[#a58452]' : 'w-1.5 bg-white/60'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function readImagesFromFiles(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
  const results: string[] = [];
  for (const file of list.slice(0, 12)) {
    results.push(await compressImage(file));
  }
  return results;
}
