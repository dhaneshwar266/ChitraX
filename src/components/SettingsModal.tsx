import React, { memo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { ThemeMode } from '../services/preferenceService';
import { playbackHistoryService } from '../services/playbackHistoryService';
import { mediaStore } from '../services/mediaStore';

interface SettingsModalProps {
  visible: boolean;
  totalVideosCount: number;
  totalFoldersCount: number;
  onClose: () => void;
  onRefreshLibrary: () => void;
}

export const SettingsModal = memo(function SettingsModal({
  visible,
  totalVideosCount,
  totalFoldersCount,
  onClose,
  onRefreshLibrary,
}: SettingsModalProps) {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();

  const handleSelectTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeMode(mode);
    },
    [setThemeMode]
  );

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear Watch History',
      'Are you sure you want to clear all playback history? Saved playback positions will be reset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            playbackHistoryService.clearAllHistory();
            Alert.alert('History Cleared', 'All playback history has been reset.');
          },
        },
      ]
    );
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.surfaceBorder }]}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="options-outline" size={22} color={colors.primaryLight} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Settings & About</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
            {/* ChitraX Branding Card */}
            <View style={[styles.brandCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
              <Image
                source={require('../../assets/images/chitrax-logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <View style={styles.brandInfo}>
                <View style={styles.brandTitleRow}>
                  <Text style={[styles.brandName, { color: colors.text }]}>ChitraX</Text>
                  <View style={[styles.versionBadge, { backgroundColor: colors.primaryGlow }]}>
                    <Text style={[styles.versionText, { color: colors.primaryLight }]}>v1.0.0</Text>
                  </View>
                </View>
                <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>
                  High-Performance Local Video Player
                </Text>
                <View style={styles.statsRow}>
                  <Text style={[styles.statItem, { color: colors.textMuted }]}>
                    📁 {totalFoldersCount} Folders
                  </Text>
                  <Text style={[styles.statDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.statItem, { color: colors.textMuted }]}>
                    🎬 {totalVideosCount} Videos
                  </Text>
                </View>
              </View>
            </View>

            {/* Appearance / Theme Section */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: colors.primaryLight }]}>APPEARANCE</Text>
              <View style={[styles.cardGroup, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
                {/* Dark Theme Option */}
                <TouchableOpacity
                  style={[styles.themeOptionRow, { borderBottomColor: colors.surfaceBorder }]}
                  onPress={() => handleSelectTheme('dark')}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeLeft}>
                    <Ionicons name="moon" size={20} color="#F3C64F" style={{ marginRight: 12 }} />
                    <View>
                      <Text style={[styles.themeTitle, { color: colors.text }]}>Dark Theme</Text>
                      <Text style={[styles.themeDesc, { color: colors.textMuted }]}>Default high-contrast obsidian palette</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={themeMode === 'dark' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={themeMode === 'dark' ? colors.primaryLight : colors.textMuted}
                  />
                </TouchableOpacity>

                {/* Light Theme Option */}
                <TouchableOpacity
                  style={[styles.themeOptionRow, { borderBottomColor: colors.surfaceBorder }]}
                  onPress={() => handleSelectTheme('light')}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeLeft}>
                    <Ionicons name="sunny" size={20} color="#f59e0b" style={{ marginRight: 12 }} />
                    <View>
                      <Text style={[styles.themeTitle, { color: colors.text }]}>Light Theme</Text>
                      <Text style={[styles.themeDesc, { color: colors.textMuted }]}>Clean, high-readability daylight style</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={themeMode === 'light' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={themeMode === 'light' ? colors.primaryLight : colors.textMuted}
                  />
                </TouchableOpacity>

                {/* System Default Option */}
                <TouchableOpacity
                  style={styles.themeOptionRow}
                  onPress={() => handleSelectTheme('system')}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeLeft}>
                    <Ionicons name="phone-portrait-outline" size={20} color="#F3C64F" style={{ marginRight: 12 }} />
                    <View>
                      <Text style={[styles.themeTitle, { color: colors.text }]}>System Default</Text>
                      <Text style={[styles.themeDesc, { color: colors.textMuted }]}>Match device system display theme</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={themeMode === 'system' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={themeMode === 'system' ? colors.primaryLight : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Library Actions Section */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: colors.primaryLight }]}>MEDIA LIBRARY</Text>
              <View style={[styles.cardGroup, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
                {/* Rescan Button */}
                <TouchableOpacity
                  style={[styles.actionRow, { borderBottomColor: colors.surfaceBorder }]}
                  onPress={() => {
                    onClose();
                    onRefreshLibrary();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionLeft}>
                    <Ionicons name="refresh-circle-outline" size={22} color={colors.primaryLight} style={{ marginRight: 12 }} />
                    <View>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>Rescan Media Storage</Text>
                      <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Scan internal storage for newly added videos</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Clear History Button */}
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={handleClearHistory}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionLeft}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} style={{ marginRight: 12 }} />
                    <View>
                      <Text style={[styles.actionTitle, { color: colors.danger }]}>Clear Watch History</Text>
                      <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Remove all saved positions and progress</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Offline Privacy Guarantee */}
            <View style={[styles.privacyBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} style={{ marginRight: 10 }} />
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                ChitraX operates 100% offline on your device. No analytics, tracking, or network media streams are used.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 36,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 14,
  },
  brandInfo: {
    flex: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  brandTagline: {
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    fontSize: 11,
    fontWeight: '600',
  },
  statDot: {
    marginHorizontal: 6,
    fontSize: 10,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeDesc: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
