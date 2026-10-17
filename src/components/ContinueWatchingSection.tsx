import React, { useEffect, useState, useCallback, memo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { VideoItem } from '../types/media';
import { mediaStore } from '../services/mediaStore';
import { playbackHistoryService, PlaybackHistoryEntry } from '../services/playbackHistoryService';
import { VideoThumbnail } from './VideoThumbnail';
import { formatDuration } from '../utils/formatters';
import { useTheme } from '../hooks/use-theme';

interface ContinueWatchingItemData {
  video: VideoItem;
  entry: PlaybackHistoryEntry;
}

export const ContinueWatchingSection = memo(function ContinueWatchingSection() {
  const router = useRouter();
  const { colors } = useTheme();
  const [items, setItems] = useState<ContinueWatchingItemData[]>([]);

  const loadActiveItems = useCallback(() => {
    const activeEntries = playbackHistoryService.getAllActiveEntries();
    const resolved: ContinueWatchingItemData[] = [];

    activeEntries.forEach((entry) => {
      const video = mediaStore.getVideo(entry.videoId);
      // Handle missing or deleted videos gracefully
      if (video) {
        resolved.push({ video, entry });
      }
    });

    setItems(resolved);
  }, []);

  useEffect(() => {
    loadActiveItems();

    // Subscribe to mediaStore updates to reload when media library updates
    const unsubscribe = mediaStore.subscribe(() => {
      loadActiveItems();
    });

    return () => {
      unsubscribe();
    };
  }, [loadActiveItems]);

  const handlePressItem = useCallback(
    (item: ContinueWatchingItemData) => {
      mediaStore.setPlaybackSession(item.video.id, item.video.folderId);
      router.push({
        pathname: '/player',
        params: {
          videoId: item.video.id,
          folderId: item.video.folderId,
        },
      });
    },
    [router]
  );

  if (items.length === 0) {
    return null;
  }

  const renderItem = ({ item }: { item: ContinueWatchingItemData }) => {
    const dur = item.entry.duration || item.video.duration || 1;
    const progressPercent = Math.min(100, Math.max(0, (item.entry.position / dur) * 100));

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.surfaceBorder }]}
        activeOpacity={0.8}
        onPress={() => handlePressItem(item)}
      >
        <View style={[styles.thumbnailWrapper, { backgroundColor: colors.surfaceElevated }]}>
          <VideoThumbnail
            videoId={item.video.id}
            videoUri={item.video.uri}
            duration={item.video.duration}
            style={styles.fullThumbnail}
            hideDurationBadge
          />
          {/* Bottom progress bar fill */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={1}>
            {item.video.title || item.video.filename}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color="#F3C64F" style={styles.timeIcon} />
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatDuration(item.entry.position)} / {formatDuration(dur)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="play-circle" size={20} color="#F3C64F" style={styles.headerIcon} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Watching</Text>
      </View>

      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.video.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F7FA',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 160,
    backgroundColor: '#12151F',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
  },
  thumbnailWrapper: {
    width: 160,
    height: 96,
    position: 'relative',
    backgroundColor: '#171B26',
  },
  fullThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  progressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(245, 247, 250, 0.12)',
    zIndex: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F3C64F',
  },
  cardInfo: {
    padding: 10,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F7FA',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
