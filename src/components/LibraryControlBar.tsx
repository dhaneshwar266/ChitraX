import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ViewMode, SortBy, SortOrder } from '../services/preferenceService';
import { useTheme } from '../hooks/use-theme';

interface LibraryControlBarProps {
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  totalCount: number;
  onToggleViewMode: () => void;
  onOpenSortModal: () => void;
  onToggleSortOrder: () => void;
}

const SORT_LABELS: Record<SortBy, string> = {
  name: 'Name',
  dateAdded: 'Date Added',
  dateModified: 'Date Modified',
  duration: 'Duration',
};

export const LibraryControlBar = memo(function LibraryControlBar({
  viewMode,
  sortBy,
  sortOrder,
  totalCount,
  onToggleViewMode,
  onOpenSortModal,
  onToggleSortOrder,
}: LibraryControlBarProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.countText, { color: colors.textSecondary }]}>
        {totalCount} {totalCount === 1 ? 'video' : 'videos'}
      </Text>

      <View style={styles.actionsRow}>
        {/* Sort By Field Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder },
          ]}
          onPress={onOpenSortModal}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Sort by ${SORT_LABELS[sortBy]}`}
        >
          <Ionicons name="swap-vertical-outline" size={15} color={colors.primaryLight} style={styles.btnIcon} />
          <Text style={[styles.actionText, { color: colors.text }]}>{SORT_LABELS[sortBy]}</Text>
        </TouchableOpacity>

        {/* Sort Order Toggle (Asc / Desc) */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder },
          ]}
          onPress={onToggleSortOrder}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Sort order ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
        >
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline'}
            size={17}
            color={colors.primaryLight}
          />
        </TouchableOpacity>

        {/* View Mode Toggle (Grid / List) */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder },
          ]}
          onPress={onToggleViewMode}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
            size={17}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnIcon: {
    marginRight: 5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconBtn: {
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 34,
    minHeight: 34,
  },
});
