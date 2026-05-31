import ImageCarousel from './ImageCarousel';
import { useTripImageUrls } from '../hooks/useTripImageUrls';

interface TripImagesProps {
  imageIds: string[];
  alt: string;
  isDarkPhase?: boolean;
  compact?: boolean;
}

export default function TripImages({
  imageIds,
  alt,
  isDarkPhase = false,
  compact = false,
}: TripImagesProps) {
  const urls = useTripImageUrls(imageIds);

  if (!imageIds.length) return null;

  if (!urls.length) {
    const heightClass = compact ? 'h-28' : 'h-36';
    return (
      <div
        className={`flex items-center justify-center rounded-xl ${heightClass} ${
          isDarkPhase ? 'bg-black/30' : 'bg-black/5'
        }`}
      >
        <span className="text-[9px] uppercase tracking-widest opacity-40">Loading photos…</span>
      </div>
    );
  }

  return (
    <ImageCarousel images={urls} alt={alt} isDarkPhase={isDarkPhase} compact={compact} />
  );
}
