import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';

interface SelectionActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAllToggle: () => void;
  onCopy: () => void;
  onCut: () => void;
  onShare: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const SelectionActionBar = memo(function SelectionActionBar({
  selectedCount,
  totalCount,
  onSelectAllToggle,
  onCopy,
  onCut,
  onShare,
  onDelete,
  onCancel,
}: SelectionActionBarProps) {
  const { colors } = useTheme();

  if (selectedCount <= 0) return null;

  const isAllSelected = selectedCount > 0 && selectedCount >= totalCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.topInfoRow}>
        <TouchableOpacity style={styles.selectAllBtn} onPress={onSelectAllToggle} activeOpacity={0.7}>
          <Ionicons
            name={isAllSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={isAllSelected ? '#F3C64F' : '#94A3B8'}
          />
          <Text style={styles.selectAllText}>
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.countText, { color: colors.text }]}>{selectedCount} Selected</Text>

        <TouchableOpacity style={styles.closeBtn} onPress={onCancel} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

      <View style={styles.actionsRow}>
        {/* Cut / Move Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={onCut} activeOpacity={0.7}>
          <Ionicons name="cut-outline" size={20} color="#F3C64F" />
          <Text style={[styles.actionText, { color: colors.text }]}>Cut</Text>
        </TouchableOpacity>

        {/* Copy Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={onCopy} activeOpacity={0.7}>
          <Ionicons name="copy-outline" size={20} color="#F3C64F" />
          <Text style={[styles.actionText, { color: colors.text }]}>Copy</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color="#F3C64F" />
          <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 14,
    right: 14,
    backgroundColor: '#10131A',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 100,
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingRight: 8,
  },
  selectAllText: {
    color: '#F3C64F',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  countText: {
    color: '#F5F7FA',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(245, 247, 250, 0.08)',
    marginVertical: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
    paddingVertical: 2,
  },
  actionText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
});
