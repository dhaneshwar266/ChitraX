import React, { memo } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SortBy, SortOrder } from '../services/preferenceService';
import { useTheme } from '../hooks/use-theme';

interface SortModalProps {
  visible: boolean;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSelectSortBy: (sortBy: SortBy) => void;
  onSelectSortOrder: (sortOrder: SortOrder) => void;
  onClose: () => void;
}

const SORT_OPTIONS: { key: SortBy; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: 'name', label: 'Name', icon: 'text-outline', desc: 'Alphabetical A-Z' },
  { key: 'dateAdded', label: 'Date Added', icon: 'calendar-outline', desc: 'Media creation date' },
  { key: 'dateModified', label: 'Date Modified', icon: 'time-outline', desc: 'Recently modified files' },
  { key: 'duration', label: 'Duration', icon: 'hourglass-outline', desc: 'Playback length' },
];

export const SortModal = memo(function SortModal({
  visible,
  sortBy,
  sortOrder,
  onSelectSortBy,
  onSelectSortOrder,
  onClose,
}: SortModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.modalOverlay, { backgroundColor: colors.backdrop }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              paddingBottom: Math.max(20, insets.bottom + 12),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Top Grab Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: colors.surfaceBorder }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="swap-vertical" size={20} color={colors.primaryLight} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sort Videos</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.closeIconBtn, { backgroundColor: colors.surfaceElevated }]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          {/* Sort By Field Options */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Sort By</Text>
          <View style={styles.optionsList}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = sortBy === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: isSelected ? colors.primaryGlow : colors.surfaceElevated,
                      borderColor: isSelected ? colors.primaryLight : colors.surfaceBorder,
                    },
                  ]}
                  onPress={() => onSelectSortBy(option.key)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.surfaceCard,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={isSelected ? '#08090C' : colors.textSecondary}
                    />
                  </View>

                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? colors.primaryLight : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                      {option.desc}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primaryLight : colors.textMuted,
                        backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <View style={styles.radioInnerDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sort Order Direction Selection */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Direction</Text>
          <View style={styles.orderRow}>
            <TouchableOpacity
              style={[
                styles.orderBtn,
                {
                  backgroundColor: sortOrder === 'asc' ? colors.primaryLight : colors.surfaceElevated,
                  borderColor: sortOrder === 'asc' ? colors.primaryLight : colors.surfaceBorder,
                },
              ]}
              onPress={() => onSelectSortOrder('asc')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={sortOrder === 'asc' ? '#08090C' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.orderText,
                  { color: sortOrder === 'asc' ? '#08090C' : colors.textSecondary },
                ]}
              >
                Ascending
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.orderBtn,
                {
                  backgroundColor: sortOrder === 'desc' ? colors.primaryLight : colors.surfaceElevated,
                  borderColor: sortOrder === 'desc' ? colors.primaryLight : colors.surfaceBorder,
                },
              ]}
              onPress={() => onSelectSortOrder('desc')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={sortOrder === 'desc' ? '#08090C' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.orderText,
                  { color: sortOrder === 'desc' ? '#08090C' : colors.textSecondary },
                ]}
              >
                Descending
              </Text>
            </TouchableOpacity>
          </View>

          {/* Apply / Done Button */}
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.primaryLight }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.applyBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optionsList: {
    gap: 8,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 11,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#08090C',
  },
  orderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  orderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  applyBtnText: {
    color: '#08090C',
    fontSize: 15,
    fontWeight: '700',
  },
});
