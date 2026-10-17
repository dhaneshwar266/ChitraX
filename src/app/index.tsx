import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  AppState,
  Alert,
  BackHandler,
  Image,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { VideoFolder, VideoItem } from '../types/media';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { mediaStore } from '../services/mediaStore';
import { playbackHistoryService, PlaybackHistoryEntry } from '../services/playbackHistoryService';
import { VideoCard } from '../components/VideoCard';
import { LibraryControlBar } from '../components/LibraryControlBar';
import { SortModal } from '../components/SortModal';
import { VideoActionModal } from '../components/VideoActionModal';
import { SettingsModal } from '../components/SettingsModal';
import { SelectionActionBar } from '../components/SelectionActionBar';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { fileManagerService } from '../services/fileManagerService';
import {
  preferenceService,
  ViewMode,
  SortBy,
  SortOrder,
  UserPreferences,
} from '../services/preferenceService';
import { sortAndFilterVideos } from '../utils/mediaSorter';
import { useTheme } from '../hooks/use-theme';
import { formatDuration, formatFileSize } from '../utils/formatters';

type HomeTab = 'folders' | 'videos' | 'history';

export default function HomeScreen() {
  const {
    folders,
    loading,
    refreshing,
    permissionGranted,
    refreshMedia,
    requestPermissions,
  } = useMediaLibrary();

  const { colors, isDark } = useTheme();

  // Active Tab: 'folders' | 'videos' | 'history'
  const [activeTab, setActiveTab] = useState<HomeTab>('folders');
  const { width: screenWidth } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);


  // Search & Preference state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const searchInputRef = useRef<TextInput>(null);
  const [prefs, setPrefs] = useState<UserPreferences>(preferenceService.getPreferencesSync());
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Video Action Sheet modal state
  const [actionVideo, setActionVideo] = useState<VideoItem | null>(null);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);

  // Multi-Selection state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

  // Watch History state
  const [historyEntries, setHistoryEntries] = useState<PlaybackHistoryEntry[]>([]);

  const loadHistory = useCallback(() => {
    setHistoryEntries(playbackHistoryService.getAllHistoryEntries());
  }, []);

  const switchTab = useCallback((tab: HomeTab, animated = true) => {
    setActiveTab(tab);
    const index = tab === 'folders' ? 0 : tab === 'videos' ? 1 : 2;
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated });
    if (tab === 'history') {
      loadHistory();
    }
  }, [screenWidth, loadHistory]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    const tab: HomeTab = index === 0 ? 'folders' : index === 1 ? 'videos' : 'history';
    if (tab !== activeTab) {
      setActiveTab(tab);
      if (tab === 'history') {
        loadHistory();
      }
    }
  }, [screenWidth, activeTab, loadHistory]);

  useEffect(() => {
    const index = activeTab === 'folders' ? 0 : activeTab === 'videos' ? 1 : 2;
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated: false });
  }, [screenWidth]);

  // Subscribe to preferences, history, and AppState active foreground re-scan
  useEffect(() => {
    const unsubscribe = preferenceService.subscribe((newPrefs) => {
      setPrefs(newPrefs);
    });

    loadHistory();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        mediaStore.scan(true).catch(() => {});
        loadHistory();
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [loadHistory]);

  const handleRefresh = useCallback(() => {
    refreshMedia();
    loadHistory();
  }, [refreshMedia, loadHistory]);

  const toggleSearch = useCallback(() => {
    setIsSearchExpanded((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
      }
      return next;
    });
  }, []);

  // Collect all videos from all folders
  const allVideos = useMemo(() => {
    if (folders && folders.length > 0) {
      const list: VideoItem[] = [];
      folders.forEach((f) => {
        if (Array.isArray(f.videos)) {
          list.push(...f.videos);
        }
      });
      if (list.length > 0) return list;
    }
    return mediaStore.getAllVideos();
  }, [folders]);

  // Filter and sort videos for global search / Videos tab
  const sortedAllVideos = useMemo(() => {
    return sortAndFilterVideos(allVideos, searchQuery, prefs.sortBy, prefs.sortOrder);
  }, [allVideos, searchQuery, prefs.sortBy, prefs.sortOrder]);

  // Filter folders matching search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;
    const q = searchQuery.trim().toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, searchQuery]);

  // Resolved history videos
  const historyVideosList = useMemo(() => {
    const list: { video: VideoItem; entry: PlaybackHistoryEntry }[] = [];
    historyEntries.forEach((entry) => {
      const v = mediaStore.getVideo(entry.videoId);
      if (v) {
        if (!searchQuery.trim() || (v.title || v.filename).toLowerCase().includes(searchQuery.trim().toLowerCase())) {
          list.push({ video: v, entry });
        }
      }
    });
    return list;
  }, [historyEntries, allVideos, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // --- Selection Mode Logic ---
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedFolderIds(new Set());
    setSelectedVideoIds(new Set());
  }, []);

  // Handle hardware Back button press when in selection mode or search mode
  useEffect(() => {
    const onBackPress = () => {
      if (isSelectionMode) {
        handleCancelSelection();
        return true;
      }
      if (isSearchExpanded) {
        setIsSearchExpanded(false);
        setSearchQuery('');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isSelectionMode, handleCancelSelection, isSearchExpanded]);

  const handleFolderPress = useCallback(
    (folder: VideoFolder) => {
      if (isSelectionMode) {
        setSelectedFolderIds((prev) => {
          const next = new Set(prev);
          if (next.has(folder.id)) {
            next.delete(folder.id);
          } else {
            next.add(folder.id);
          }
          if (next.size === 0 && selectedVideoIds.size === 0) {
            setIsSelectionMode(false);
          }
          return next;
        });
      } else {
        router.push({
          pathname: '/folder/[id]',
          params: {
            id: encodeURIComponent(folder.id),
            name: folder.name,
          },
        });
      }
    },
    [isSelectionMode, selectedVideoIds.size]
  );

  const handleFolderLongPress = useCallback((folder: VideoFolder) => {
    setIsSelectionMode(true);
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folder.id)) {
        next.delete(folder.id);
      } else {
        next.add(folder.id);
      }
      return next;
    });
  }, []);

  const handleVideoPress = useCallback(
    (video: VideoItem) => {
      if (isSelectionMode) {
        setSelectedVideoIds((prev) => {
          const next = new Set(prev);
          if (next.has(video.id)) {
            next.delete(video.id);
          } else {
            next.add(video.id);
          }
          if (next.size === 0 && selectedFolderIds.size === 0) {
            setIsSelectionMode(false);
          }
          return next;
        });
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
    },
    [isSelectionMode, selectedFolderIds.size]
  );

  const handleVideoLongPress = useCallback((video: VideoItem) => {
    setIsSelectionMode(true);
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(video.id)) {
        next.delete(video.id);
      } else {
        next.add(video.id);
      }
      return next;
    });
  }, []);

  const handleSelectAllToggle = useCallback(() => {
    if (activeTab === 'videos' || isSearching) {
      if (selectedVideoIds.size >= sortedAllVideos.length) {
        setSelectedVideoIds(new Set());
      } else {
        setSelectedVideoIds(new Set(sortedAllVideos.map((v) => v.id)));
      }
    } else {
      if (selectedFolderIds.size >= folders.length) {
        setSelectedFolderIds(new Set());
      } else {
        setSelectedFolderIds(new Set(folders.map((f) => f.id)));
      }
    }
  }, [activeTab, isSearching, sortedAllVideos, selectedVideoIds.size, folders, selectedFolderIds.size]);

  const getSelectedVideosList = useCallback((): VideoItem[] => {
    const list: VideoItem[] = [];
    folders.forEach((f) => {
      if (selectedFolderIds.has(f.id)) {
        list.push(...f.videos);
      }
    });
    if (selectedVideoIds.size > 0) {
      const allVidsMap = new Map(allVideos.map((v) => [v.id, v]));
      selectedVideoIds.forEach((id) => {
        const v = allVidsMap.get(id);
        if (v && !list.some((item) => item.id === v.id)) {
          list.push(v);
        }
      });
    }
    return list;
  }, [folders, selectedFolderIds, selectedVideoIds, allVideos]);

  const handleCopy = useCallback(() => {
    const videos = getSelectedVideosList();
    if (videos.length === 0) return;
    fileManagerService.setCopy(videos);
    Alert.alert('Copied to Clipboard', );
    handleCancelSelection();
  }, [getSelectedVideosList, handleCancelSelection]);

  const handleCut = useCallback(() => {
    const videos = getSelectedVideosList();
    if (videos.length === 0) return;
    fileManagerService.setCut(videos);
    Alert.alert('Cut to Clipboard', );
    handleCancelSelection();
  }, [getSelectedVideosList, handleCancelSelection]);

  const handleShare = useCallback(async () => {
    const videos = getSelectedVideosList();
    if (videos.length === 0) return;
    await fileManagerService.shareSelectedVideos(videos);
  }, [getSelectedVideosList]);

  const handleDelete = useCallback(async () => {
    const videos = getSelectedVideosList();
    if (videos.length === 0) return;
    const deleted = await fileManagerService.deleteSelectedVideos(videos);
    if (deleted) {
      handleCancelSelection();
    }
  }, [getSelectedVideosList, handleCancelSelection]);

  const handleOpenMenu = useCallback((video: VideoItem) => {
    setActionVideo(video);
    setShowActionModal(true);
  }, []);

  const handleToggleViewMode = useCallback(() => {
    const nextMode: ViewMode = prefs.viewMode === 'grid' ? 'list' : 'grid';
    preferenceService.updatePreferences({ viewMode: nextMode });
  }, [prefs.viewMode]);

  const handleToggleSortOrder = useCallback(() => {
    const nextOrder: SortOrder = prefs.sortOrder === 'asc' ? 'desc' : 'asc';
    preferenceService.updatePreferences({ sortOrder: nextOrder });
  }, [prefs.sortOrder]);

  const handleSelectSortBy = useCallback((sortBy: SortBy) => {
    preferenceService.updatePreferences({ sortBy });
  }, []);

  // Render Single Folder Row
  const renderFolderItem = useCallback(
    ({ item }: { item: VideoFolder }) => {
      const isSelected = selectedFolderIds.has(item.id);
      const totalDuration = item.videos.reduce((acc, v) => acc + (v.duration || 0), 0);
      const totalSize = item.videos.reduce((acc, v) => acc + (v.size || 0), 0);
      const firstVideo = item.videos.length > 0 ? item.videos[0] : null;

      return (
        <TouchableOpacity
          style={[
            styles.folderCard,
            {
              backgroundColor: isSelected ? colors.primaryGlow : colors.surfaceCard,
              borderColor: isSelected ? colors.primaryLight : colors.surfaceBorder,
            },
          ]}
          activeOpacity={0.7}
          delayLongPress={250}
          onPress={() => handleFolderPress(item)}
          onLongPress={() => handleFolderLongPress(item)}
        >
          {isSelectionMode && (
            <View style={styles.folderCheckPos}>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={isSelected ? colors.primaryLight : colors.textMuted}
              />
            </View>
          )}

          <View style={[styles.folderThumbContainer, { backgroundColor: colors.surfaceElevated }]}>
            {firstVideo ? (
              <VideoThumbnail
                videoId={firstVideo.id}
                videoUri={firstVideo.uri}
                duration={firstVideo.duration}
                style={styles.folderThumb}
                hideDurationBadge
              />
            ) : (
              <Ionicons name="folder" size={28} color={colors.primaryLight} />
            )}
            <View style={styles.folderIconBadge}>
              <Ionicons name="folder" size={11} color="#08090C" />
            </View>
          </View>

          <View style={styles.folderDetails}>
            <Text style={[styles.folderName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.folderMetaRow}>
              <Text style={[styles.folderMetaText, { color: colors.textSecondary }]}>
                {item.videos.length} {item.videos.length === 1 ? 'video' : 'videos'}
              </Text>
              {totalSize > 0 && (
                <>
                  <Text style={[styles.folderMetaDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.folderMetaText, { color: colors.textSecondary }]}>
                    {formatFileSize(totalSize)}
                  </Text>
                </>
              )}
              {totalDuration > 0 && (
                <>
                  <Text style={[styles.folderMetaDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.folderMetaText, { color: colors.textSecondary }]}>
                    {formatDuration(totalDuration)}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={[styles.folderCountPill, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.folderCountPillText, { color: colors.textSecondary }]}>
              {item.videos.length}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      );
    },
    [selectedFolderIds, isSelectionMode, colors, handleFolderPress, handleFolderLongPress]
  );

  // Render Single History Item Row
  const renderHistoryItem = useCallback(
    ({ item }: { item: { video: VideoItem; entry: PlaybackHistoryEntry } }) => {
      const dur = item.entry.duration || item.video.duration || 1;
      const progressPercent = Math.min(100, Math.max(0, (item.entry.position / dur) * 100));

      return (
        <TouchableOpacity
          style={[styles.historyCard, { backgroundColor: colors.surfaceCard, borderColor: colors.surfaceBorder }]}
          activeOpacity={0.7}
          onPress={() => handleVideoPress(item.video)}
        >
          <View style={[styles.historyThumbWrap, { backgroundColor: colors.surfaceElevated }]}>
            <VideoThumbnail videoId={item.video.id} videoUri={item.video.uri} duration={item.video.duration} style={styles.historyThumb} hideDurationBadge />
            <View style={styles.historyProgressBg}>
              <View style={[styles.historyProgressFill, { width: `${progressPercent}%`, backgroundColor: colors.primaryLight }]} />
            </View>
          </View>

          <View style={styles.historyDetails}>
            <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
              {item.video.title || item.video.filename}
            </Text>
            <Text style={[styles.historyFolder, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.video.folderName || 'Video'}
            </Text>
            <View style={styles.historyMetaRow}>
              <Ionicons name="time-outline" size={13} color={colors.primaryLight} style={{ marginRight: 4 }} />
              <Text style={[styles.historyTime, { color: colors.primaryLight }]}>
                {formatDuration(item.entry.position)} / {formatDuration(dur)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.historyMenuBtn}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenMenu(item.video);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [colors, handleVideoPress, handleOpenMenu]
  );

  // If permission is not granted yet
  if (!permissionGranted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <View style={[styles.permissionIconCircle, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="folder-open-outline" size={48} color={colors.primaryLight} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Permission Needed</Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            ChitraX requires access to your device media library to display folders and play your local video files.
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermissions}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#08090C" style={{ marginRight: 8 }} />
            <Text style={styles.permissionBtnText}>Grant Storage Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* 1. Top Custom App Bar */}
      <View style={[styles.appBar, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder }]}>
        {isSearchExpanded ? (
          <View style={styles.searchBarRow}>
            <Ionicons name="search" size={20} color={colors.primaryLight} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search local videos and folders..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.searchCloseBtn} onPress={toggleSearch}>
              <Text style={[styles.searchCloseText, { color: colors.primaryLight }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.appBarMainRow}>
            {/* Left: Brand Identity */}
            <View style={styles.brandRow}>
              <Image
                source={require('../../assets/images/chitrax-logo.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
              <View>
                <Text style={[styles.brandTitle, { color: colors.text }]}>ChitraX</Text>
                <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
                  {folders.length} folders • {allVideos.length} videos
                </Text>
              </View>
            </View>

            {/* Right: Actions */}
            <View style={styles.appBarActions}>
              <TouchableOpacity
                style={[styles.actionIconBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={toggleSearch}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Search videos"
              >
                <Ionicons name="search-outline" size={20} color={colors.primaryLight} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIconBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={handleToggleViewMode}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Toggle grid/list"
              >
                <Ionicons name={prefs.viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIconBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={handleRefresh}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Refresh library"
              >
                <Ionicons name="refresh-outline" size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIconBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => setShowSettingsModal(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 2. Top Segmented Navigation Tabs */}
        {!isSearchExpanded && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'folders' && { borderBottomColor: colors.primaryLight }]}
              onPress={() => switchTab('folders')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeTab === 'folders' ? 'folder' : 'folder-outline'}
                size={18}
                color={activeTab === 'folders' ? colors.primaryLight : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabLabel, { color: activeTab === 'folders' ? colors.primaryLight : colors.textSecondary }]}>
                Folders
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: activeTab === 'folders' ? colors.primaryGlow : colors.surfaceElevated }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === 'folders' ? colors.primaryLight : colors.textMuted }]}>
                  {folders.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'videos' && { borderBottomColor: colors.primaryLight }]}
              onPress={() => switchTab('videos')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeTab === 'videos' ? 'videocam' : 'videocam-outline'}
                size={18}
                color={activeTab === 'videos' ? colors.primaryLight : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabLabel, { color: activeTab === 'videos' ? colors.primaryLight : colors.textSecondary }]}>
                Videos
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: activeTab === 'videos' ? colors.primaryGlow : colors.surfaceElevated }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === 'videos' ? colors.primaryLight : colors.textMuted }]}>
                  {allVideos.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'history' && { borderBottomColor: colors.primaryLight }]}
              onPress={() => switchTab('history')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeTab === 'history' ? 'time' : 'time-outline'}
                size={18}
                color={activeTab === 'history' ? colors.primaryLight : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabLabel, { color: activeTab === 'history' ? colors.primaryLight : colors.textSecondary }]}>
                History
              </Text>
              {historyEntries.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: activeTab === 'history' ? colors.primaryGlow : colors.surfaceElevated }]}>
                  <Text style={[styles.tabBadgeText, { color: activeTab === 'history' ? colors.primaryLight : colors.textMuted }]}>
                    {historyEntries.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. Main Content Views */}
      {loading && folders.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Scanning device for videos...</Text>
        </View>
      ) : isSearching ? (
        // Search View (Only search results when searching)
        <View style={{ flex: 1 }}>
          <FlatList
            key={prefs.viewMode}
            data={sortedAllVideos}
            keyExtractor={(item) => item.id}
            numColumns={prefs.viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={prefs.viewMode === 'grid' ? styles.gridRow : undefined}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <VideoCard
                video={item}
                viewMode={prefs.viewMode}
                folderName={item.folderName}
                isSelectionMode={isSelectionMode}
                isSelected={selectedVideoIds.has(item.id)}
                onPress={handleVideoPress}
                onLongPress={handleVideoLongPress}
                onMenuPress={handleOpenMenu}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="videocam-outline" size={52} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matching Videos</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Try searching with a different filename or query.
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        // Swipeable Tabs Container (Swipe left/right between Folders, Videos, History)
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          scrollEnabled={!isSelectionMode}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: screenWidth * 3 }}
        >
          {/* TAB 1: FOLDERS */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              data={filteredFolders}
              keyExtractor={(item) => item.id}
              renderItem={renderFolderItem}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryLight} />}
              ListHeaderComponent={
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>VIDEO FOLDERS</Text>
                  <TouchableOpacity
                    style={[styles.sortSmallBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}
                    onPress={() => setShowSortModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="swap-vertical-outline" size={14} color={colors.primaryLight} style={{ marginRight: 4 }} />
                    <Text style={[styles.sortSmallText, { color: colors.primaryLight }]}>Sort</Text>
                  </TouchableOpacity>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-open-outline" size={52} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Video Folders Found</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Pull down to rescan or add video files to your device storage.
                  </Text>
                </View>
              }
            />
          </View>

          {/* TAB 2: VIDEOS */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              key={prefs.viewMode}
              data={sortedAllVideos}
              keyExtractor={(item) => item.id}
              numColumns={prefs.viewMode === 'grid' ? 2 : 1}
              columnWrapperStyle={prefs.viewMode === 'grid' ? styles.gridRow : undefined}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryLight} />}
              ListHeaderComponent={
                <LibraryControlBar
                  viewMode={prefs.viewMode}
                  sortBy={prefs.sortBy}
                  sortOrder={prefs.sortOrder}
                  totalCount={sortedAllVideos.length}
                  onToggleViewMode={handleToggleViewMode}
                  onOpenSortModal={() => setShowSortModal(true)}
                  onToggleSortOrder={handleToggleSortOrder}
                />
              }
              renderItem={({ item }) => (
                <VideoCard
                  video={item}
                  viewMode={prefs.viewMode}
                  folderName={item.folderName}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedVideoIds.has(item.id)}
                  onPress={handleVideoPress}
                  onLongPress={handleVideoLongPress}
                  onMenuPress={handleOpenMenu}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="videocam-outline" size={52} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Videos Found</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Pull down to refresh and scan your storage.
                  </Text>
                </View>
              }
            />
          </View>

          {/* TAB 3: WATCH HISTORY */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <FlatList
              data={historyVideosList}
              keyExtractor={(item) => item.video.id}
              renderItem={renderHistoryItem}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primaryLight} />}
              ListHeaderComponent={
                historyVideosList.length > 0 ? (
                  <View style={styles.historyHeaderRow}>
                    <Text style={[styles.historyCountText, { color: colors.textSecondary }]}>
                      {historyVideosList.length} played videos
                    </Text>
                    <TouchableOpacity
                      style={styles.clearHistoryBtn}
                      onPress={() => {
                        Alert.alert('Clear History', 'Reset all watch history?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Clear All',
                            style: 'destructive',
                            onPress: () => {
                              playbackHistoryService.clearAllHistory();
                              loadHistory();
                            },
                          },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.danger} style={{ marginRight: 4 }} />
                      <Text style={[styles.clearHistoryText, { color: colors.danger }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="time-outline" size={52} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Watch History</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Videos you play will appear here with your saved position so you can resume anytime.
                  </Text>
                </View>
              }
            />
          </View>
        </ScrollView>
      )}

      {/* Selection Action Bar (when selecting items) */}
      <SelectionActionBar
        selectedCount={selectedFolderIds.size + selectedVideoIds.size}
        totalCount={activeTab === 'videos' || isSearching ? sortedAllVideos.length : folders.length}
        onSelectAllToggle={handleSelectAllToggle}
        onCopy={handleCopy}
        onCut={handleCut}
        onShare={handleShare}
        onDelete={handleDelete}
        onCancel={handleCancelSelection}
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        sortBy={prefs.sortBy}
        sortOrder={prefs.sortOrder}
        onSelectSortBy={handleSelectSortBy}
        onSelectSortOrder={(sortOrder) => preferenceService.updatePreferences({ sortOrder })}
        onClose={() => setShowSortModal(false)}
      />

      {/* Video Action Sheet Modal */}
      {actionVideo && (
        <VideoActionModal
          visible={showActionModal}
          video={actionVideo}
          onClose={() => {
            setShowActionModal(false);
            setActionVideo(null);
          }}
        />
      )}

      {/* Settings & About Modal */}
      <SettingsModal
        visible={showSettingsModal}
        totalVideosCount={allVideos.length}
        totalFoldersCount={folders.length}
        onClose={() => setShowSettingsModal(false)}
        onRefreshLibrary={handleRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  appBarMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoImg: {
    width: 36,
    height: 36,
    borderRadius: 9,
    marginRight: 10,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginRight: 6,
  },
  offlineBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  offlineText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  searchCloseBtn: {
    marginLeft: 10,
    paddingVertical: 4,
  },
  searchCloseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sortSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  sortSmallText: {
    fontSize: 12,
    fontWeight: '700',
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  folderCheckPos: {
    marginRight: 10,
  },
  folderThumbContainer: {
    width: 58,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginRight: 14,
  },
  folderThumb: {
    width: '100%',
    height: '100%',
  },
  folderIconBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(212, 175, 55, 0.95)',
    borderRadius: 6,
    padding: 3,
  },
  folderDetails: {
    flex: 1,
  },
  folderName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  folderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  folderMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  folderMetaDot: {
    marginHorizontal: 5,
    fontSize: 10,
  },
  folderCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  folderCountPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyCountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyThumbWrap: {
    width: 100,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  historyThumb: {
    width: '100%',
    height: '100%',
  },
  historyProgressBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  historyProgressFill: {
    height: '100%',
  },
  historyDetails: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyFolder: {
    fontSize: 11,
    marginBottom: 4,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyMenuBtn: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#08090C',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
