import React, { useEffect, useState, memo, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { thumbnailService } from '../services/thumbnailService';
import { formatDuration } from '../utils/formatters';

interface VideoThumbnailProps {
  videoId: string;
  videoUri: string;
  duration?: number;
  style?: any;
  hideDurationBadge?: boolean;
}

export const VideoThumbnail = memo(function VideoThumbnail({
  videoId,
  videoUri,
  duration,
  style,
  hideDurationBadge = false,
}: VideoThumbnailProps) {
  const [thumbUri, setThumbUri] = useState<string | null>(() => {
    return thumbnailService.getCachedUri(videoId);
  });

  const [hasFailed, setHasFailed] = useState<boolean>(() => {
    return thumbnailService.isFailed(videoId);
  });

  const fetchThumbnail = useCallback(() => {
    const cached = thumbnailService.getCachedUri(videoId);
    if (cached) {
      setThumbUri(cached);
      setHasFailed(false);
      return () => {};
    }

    if (thumbnailService.isFailed(videoId)) {
      setHasFailed(true);
      return () => {};
    }

    setHasFailed(false);

    return thumbnailService.requestThumbnail(
      videoId,
      videoUri,
      duration,
      (uri) => {
        if (uri) {
          setThumbUri(uri);
          setHasFailed(false);
        } else {
          setHasFailed(true);
        }
      }
    );
  }, [videoId, videoUri, duration]);

  useEffect(() => {
    const cancel = fetchThumbnail();
    return () => {
      if (typeof cancel === 'function') cancel();
    };
  }, [fetchThumbnail]);

  const handleImageError = useCallback(() => {
    // Invalidate stale or missing disk cache entry and trigger regeneration
    thumbnailService.invalidate(videoId);
    setThumbUri(null);
    thumbnailService.requestThumbnail(
      videoId,
      videoUri,
      duration,
      (uri) => {
        if (uri) {
          setThumbUri(uri);
          setHasFailed(false);
        } else {
          setHasFailed(true);
        }
      }
    );
  }, [videoId, videoUri, duration]);

  return (
    <View style={[styles.thumbnailContainer, style]}>
      {thumbUri && !hasFailed ? (
        <Image
          source={{ uri: thumbUri }}
          style={styles.thumbnailImage}
          contentFit="cover"
          transition={150}
          cachePolicy="memory"
          onError={handleImageError}
        />
      ) : (
        /* Fallback placeholder when loading or generation failed */
        <View style={styles.placeholderContainer}>
          <Ionicons name="film-outline" size={24} color="#64748B" />
        </View>
      )}

      {/* Play Icon Badge Overlay */}
      <View style={styles.thumbnailOverlay}>
        <Ionicons name="play" size={16} color="#ffffff" style={styles.playIcon} />
      </View>

      {/* Duration Badge */}
      {!hideDurationBadge && typeof duration === 'number' && duration > 0 && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  thumbnailContainer: {
    width: 100,
    height: 62,
    borderRadius: 10,
    backgroundColor: '#171B26',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#171B26',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  thumbnailOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(8, 9, 12, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  playIcon: {
    marginLeft: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(8, 9, 12, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 3,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f8fafc',
  },
});
