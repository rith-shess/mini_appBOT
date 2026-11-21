export interface VideoInfo {
  type: 'youtube' | 'direct' | 'other';
  embedUrl: string;
  rawUrl: string;
}

/**
 * Parses a video URL (YouTube, direct MP4, or generic) and returns embed parameters.
 */
export function parseVideoUrl(url?: string): VideoInfo | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube matchers:
  // - https://youtu.be/Xb6rdzqBuG0?si=...
  // - https://www.youtube.com/watch?v=Xb6rdzqBuG0
  // - https://www.youtube.com/embed/Xb6rdzqBuG0
  // - https://youtube.com/shorts/Xb6rdzqBuG0
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0`,
      rawUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  // Direct video file (.mp4, .webm, .ogg)
  if (/\.(mp4|webm|ogg)($|\?)/i.test(trimmed)) {
    return {
      type: 'direct',
      embedUrl: trimmed,
      rawUrl: trimmed,
    };
  }

  // Other URL fallback
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      type: 'other',
      embedUrl: trimmed,
      rawUrl: trimmed,
    };
  }

  return null;
}

/**
 * Extracts a video URL from plain text (e.g. if pasted in description: "YouTube: https://youtu.be/...")
 * and cleans up the text description.
 */
export function extractVideoFromText(text: string): { cleanedText: string; videoUrl?: string } {
  if (!text) return { cleanedText: '' };

  const ytRegex = /(?:(?:YouTube|Video|Link|FB|Facebook):\s*)?(https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))[a-zA-Z0-9_\-?=&#%+.]+)/i;
  const match = text.match(ytRegex);

  if (match) {
    const videoUrl = match[1];
    // Remove the matched link and any preceding "YouTube:" / extra spaces from text
    const cleanedText = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();
    return { cleanedText, videoUrl };
  }

  return { cleanedText: text };
}
