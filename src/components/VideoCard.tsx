import React, { memo, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoItem } from '../types/media';
import { VideoThumbnail } from './VideoThumbnail';
import { ViewMode } from '../services/preferenceService';
import { useTheme } from '../hooks/use-theme';
import { formatDuration, formatFileSize } from '../utils/formatters';

interface VideoCardProps {
  video: VideoItem;
  viewMode: ViewMode;
  folderName?: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onPress: (video: VideoItem) => void;
  onLongPress?: (video: VideoItem) => void;
  onMenuPress?: (video: VideoItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;

function getQualityBadge(video: VideoItem): string | null {
  const h = video.height || 0;
  const w = video.width || 0;
  const maxDim = Math.max(h, w);
  if (maxDim >= 3840 || (w >= 3800 || h >= 2100)) return '4K';
  if (maxDim >= 1920 || (w >= 1900 || h >= 1050)) return 'FHD';
  if (maxDim >= 1280 || (w >= 1200 || h >= 700)) return 'HD';
  return null;
}

export const VideoCard = memo(
  function VideoCard({
    video,
    viewMode,
    folderName,
    isSelectionMode = false,
    isSelected = false,
    onPress,
    onLongPress,
    onMenuPress,
  }: VideoCardProps) {
    const { colors } = useTheme();
    const isGrid = viewMode === 'grid';
    const qualityBadge = getQualityBadge(video);
    const fileSizeStr = video.size && video.size > 0 ? formatFileSize(video.size) : null;
    const resolvedFolderName = folderName || video.folderName;

    const handlePress = useCallback(() => {
      onPress(video);
    }, [onPress, video]);

    const handleLongPress = useCallback(() => {
      onLongPress?.(video);
    }, [onLongPress, video]);

    const handleMenuPress = useCallback(
      (e: any) => {
        e.stopPropagation();
        onMenuPress?.(video);
      },
      [onMenuPress, video]
    );

    if (isGrid) {
      return (
        <TouchableOpacity
          style={[
            styles.gridCard,
            {
              width: GRID_CARD_WIDTH,
              backgroundColor: isSelected ? colors.primaryGlow : colors.surfaceCard,
              borderColor: isSelected ? colors.primaryLight : colors.surfaceBorder,
            },
          ]}
          activeOpacity={0.7}
          delayLongPress={250}
          onPress={handlePress}
          onLongPress={handleLongPress}
          accessibilityLabel={`Play video ${video.title || video.filename}`}
        >
          <View style={[styles.gridThumbnailContainer, { backgroundColor: colors.surfaceElevated }]}>
            <VideoThumbnail videoId={video.id} videoUri={video.uri} duration={video.duration} style={styles.gridThumbnail} />
            {qualityBadge && (
              <View style={styles.qualityBadgeTopLeft}>
                <Text style={styles.qualityText}>{qualityBadge}</Text>
              </View>
            )}
            {video.duration ? (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
              </View>
            ) : null}
            {isSelectionMode && (
              <View style={styles.selectionCheckPos}>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? '#F3C64F' : 'rgba(255, 255, 255, 0.7)'}
                />
              </View>
            )}
          </View>

          <View style={styles.gridDetails}>
            <View style={styles.gridTitleRow}>
              <Text style={[styles.videoTitleGrid, { color: colors.text }]} numberOfLines={2}>
                {video.title || video.filename}
              </Text>
              {onMenuPress && (
                <TouchableOpacity
                  style={styles.gridMenuBtn}
                  onPress={handleMenuPress}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Video options"
                >
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.metaRow}>
              {resolvedFolderName ? (
                <Text style={[styles.subtext, { color: colors.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                  {resolvedFolderName}
                </Text>
              ) : null}
              {fileSizeStr ? (
                <>
                  {resolvedFolderName && <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>}
                  <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                    {fileSizeStr}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // List View Layout
    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          {
            backgroundColor: isSelected ? colors.primaryGlow : colors.surfaceCard,
            borderColor: isSelected ? colors.primaryLight : colors.surfaceBorder,
          },
        ]}
        activeOpacity={0.7}
        delayLongPress={250}
        onPress={handlePress}
        onLongPress={handleLongPress}
        accessibilityLabel={`Play video ${video.title || video.filename}`}
      >
        {isSelectionMode && (
          <View style={styles.listSelectionCheck}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSelected ? '#F3C64F' : '#94A3B8'}
            />
          </View>
        )}
        <View style={[styles.listThumbnailContainer, { backgroundColor: colors.surfaceElevated }]}>
          <VideoThumbnail videoId={video.id} videoUri={video.uri} duration={video.duration} style={styles.listThumbnail} />
          {qualityBadge && (
            <View style={styles.qualityBadgeTopLeft}>
              <Text style={styles.qualityText}>{qualityBadge}</Text>
            </View>
          )}
          {video.duration ? (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.listDetails}>
          <Text style={[styles.videoTitleList, { color: colors.text }]} numberOfLines={2}>
            {video.title || video.filename}
          </Text>
          <View style={styles.metaRow}>
            {resolvedFolderName ? (
              <View style={styles.folderBadgeRow}>
                <Ionicons name="folder-outline" size={11} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={[styles.subtext, { color: colors.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                  {resolvedFolderName}
                </Text>
              </View>
            ) : null}
            {fileSizeStr ? (
              <>
                {resolvedFolderName && <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>}
                <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                  {fileSizeStr}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {onMenuPress && (
          <TouchableOpacity
            style={styles.listMenuBtn}
            onPress={handleMenuPress}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Video options"
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.video.id === next.video.id &&
    prev.viewMode === next.viewMode &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isSelected === next.isSelected &&
    prev.folderName === next.folderName
);

const styles = StyleSheet.create({
  gridCard: {
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: '#12151F',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
  },
  gridThumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#171B26',
    position: 'relative',
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
  },
  gridDetails: {
    padding: 10,
  },
  gridTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  videoTitleGrid: {
    flex: 1,
    color: '#F5F7FA',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    marginRight: 4,
  },
  gridMenuBtn: {
    padding: 2,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#12151F',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
  },
  listThumbnailContainer: {
    width: 120,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#171B26',
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  listThumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(8, 9, 12, 0.88)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  qualityBadgeTopLeft: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.92)',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  qualityText: {
    color: '#08090C',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  listDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitleList: {
    color: '#F5F7FA',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  folderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '65%',
  },
  metaDot: {
    marginHorizontal: 5,
    fontSize: 11,
  },
  subtext: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  listMenuBtn: {
    padding: 8,
    marginLeft: 4,
  },
  selectedCard: {
    backgroundColor: '#202637',
    borderColor: '#F3C64F',
  },
  selectionCheckPos: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
  },
  listSelectionCheck: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
