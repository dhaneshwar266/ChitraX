import { VideoItem } from '../types/media';
import { SortBy, SortOrder } from '../services/preferenceService';

/**
 * Enhanced search and sort utility for VideoItems.
 * Supports multi-term search matching title, filename, folder, format extension, and resolution tags.
 */
export function sortAndFilterVideos(
  videos: VideoItem[],
  searchQuery: string,
  sortBy: SortBy,
  sortOrder: SortOrder
): VideoItem[] {
  if (!videos || videos.length === 0) return [];

  const rawQuery = searchQuery.trim().toLowerCase();

  // 1. Filter items by multi-term search query
  let filtered = videos;
  if (rawQuery) {
    const searchTerms = rawQuery.split(/\s+/).filter(Boolean);

    filtered = videos.filter((video) => {
      const title = (video.title || '').toLowerCase();
      const filename = (video.filename || '').toLowerCase();
      const folderName = (video.folderName || '').toLowerCase();

      // Resolution tags helper
      let resTag = '';
      if (video.width && video.height) {
        const maxDim = Math.max(video.width, video.height);
        if (maxDim >= 3840) resTag = '4k 2160p';
        else if (maxDim >= 1920) resTag = '1080p fhd hd';
        else if (maxDim >= 1280) resTag = '720p hd';
        else resTag = 'sd';
      }

      // Check if ALL search terms match at least one attribute
      return searchTerms.every((term) => {
        return (
          title.includes(term) ||
          filename.includes(term) ||
          folderName.includes(term) ||
          resTag.includes(term)
        );
      });
    });
  }

  if (filtered.length <= 1) return filtered;

  // 2. Pre-extract sort keys O(N) to eliminate redundant string operations during sort
  if (sortBy === 'name') {
    const mapped = filtered.map((v) => ({
      video: v,
      key: (v.title || v.filename).toLowerCase(),
    }));

    mapped.sort((a, b) => {
      const cmp = a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return mapped.map((m) => m.video);
  }

  // Fast numeric sorts for dates and duration
  const dir = sortOrder === 'desc' ? -1 : 1;
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'dateAdded') {
      diff = (a.creationTime || 0) - (b.creationTime || 0);
    } else if (sortBy === 'dateModified') {
      diff = (a.modificationTime || 0) - (b.modificationTime || 0);
    } else if (sortBy === 'duration') {
      diff = (a.duration || 0) - (b.duration || 0);
    }
    return diff * dir;
  });

  return sorted;
}
