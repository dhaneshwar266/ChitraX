import React, { useEffect, useState, useCallback, memo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { VideoItem } from '../types/media';
import { mediaStore } from '../services/mediaStore';
import { favoritesService } from '../services/favoritesService';
import { VideoThumbnail } from './VideoThumbnail';
import { formatDuration } from '../utils/formatters';
import { useTheme } from '../hooks/use-theme';

interface FavoritesSectionProps {
  onVideoPress?: (video: VideoItem) => void;
  onVideoMenuPress?: (video: VideoItem) => void;
}

export const FavoritesSection = memo(function FavoritesSection({
  onVideoPress,
  onVideoMenuPress,
}: FavoritesSectionProps) {
  const { colors } = useTheme();
  const [favoriteVideos, setFavoriteVideos] = useState<VideoItem[]>([]);

  const updateFavoritesList = useCallback(() => {
    const favoriteIds = favoritesService.getFavoriteIds();
    const items: VideoItem[] = [];
    favoriteIds.forEach((id) => {
      const vid = mediaStore.getVideo(id);
      if (vid) {
        items.push(vid);
      }
    });
    setFavoriteVideos(items);
  }, []);

  useEffect(() => {
    updateFavoritesList();

    const unsubFavs = favoritesService.subscribe(() => {
      updateFavoritesList();
    });

    const unsubStore = mediaStore.subscribe(() => {
      updateFavoritesList();
    });

    return () => {
      unsubFavs();
      unsubStore();
    };
  }, [updateFavoritesList]);

  const handlePlayVideo = (video: VideoItem) => {
    if (onVideoPress) {
      onVideoPress(video);
    } else {
      mediaStore.setPlaybackSession(video.id, video.folderId);
      router.push({
        pathname: '/player',
        params: {
          videoId: video.id,
          folderId: video.folderId,
        },
      });
    }
  };

  if (favoriteVideos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="heart" size={18} color="#ef4444" style={styles.headerIcon} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Favorites</Text>
        </View>
        <Text style={[styles.badgeCount, { backgroundColor: colors.surfaceElevated, color: colors.textSecondary }]}>{favoriteVideos.length}</Text>
      </View>

      <FlatList
        horizontal
        data={favoriteVideos}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.surfaceBorder }]}
            activeOpacity={0.8}
            onPress={() => handlePlayVideo(item)}
          >
            <View style={[styles.thumbnailContainer, { backgroundColor: colors.surfaceElevated }]}>
              <VideoThumbnail videoId={item.id} videoUri={item.uri} style={styles.thumbnail} />
              {item.duration ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
                </View>
              ) : null}
              <View style={styles.heartBadge}>
                <Ionicons name="heart" size={12} color="#ef4444" />
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title || item.filename}
              </Text>
              {onVideoMenuPress && (
                <TouchableOpacity
                  style={styles.menuBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onVideoMenuPress(item);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-vertical" size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F7FA',
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#171B26',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  card: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#12151F',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
  },
  thumbnailContainer: {
    width: '100%',
    height: 80,
    backgroundColor: '#171B26',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(8, 9, 12, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  heartBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(8, 9, 12, 0.80)',
    borderRadius: 10,
    padding: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  videoTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#F5F7FA',
  },
  menuBtn: {
    paddingLeft: 4,
  },
});
