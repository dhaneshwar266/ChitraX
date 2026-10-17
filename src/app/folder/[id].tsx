import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { VideoItem } from '../../types/media';
import { useMediaLibrary } from '../../hooks/useMediaLibrary';
import { mediaStore } from '../../services/mediaStore';
import { VideoCard } from '../../components/VideoCard';
import { LibraryControlBar } from '../../components/LibraryControlBar';
import { SortModal } from '../../components/SortModal';
import { VideoActionModal } from '../../components/VideoActionModal';
import { SelectionActionBar } from '../../components/SelectionActionBar';
import { fileManagerService, ClipboardState } from '../../services/fileManagerService';
import {
  preferenceService,
  ViewMode,
  SortBy,
  SortOrder,
  UserPreferences,
} from '../../services/preferenceService';
import { sortAndFilterVideos } from '../../utils/mediaSorter';
import { useTheme } from '../../hooks/use-theme';

export default function VideoListScreen() {
  const rawParams = useLocalSearchParams<{
    id: string | string[];
    name?: string;
  }>();

  const rawIdStr = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id || '';
  const id = useMemo(() => {
    if (!rawIdStr) return '';
    try {
      return decodeURIComponent(rawIdStr);
    } catch (e) {
      return rawIdStr;
    }
  }, [rawIdStr]);

  const name = rawParams.name;

  const router = useRouter();
  const navigation = useNavigation();
  const { getFolder } = useMediaLibrary();
  const { colors } = useTheme();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const searchInputRef = React.useRef<TextInput>(null);

  // Preference state
  const [prefs, setPrefs] = useState<UserPreferences>(preferenceService.getPreferencesSync());
  const [showSortModal, setShowSortModal] = useState<boolean>(false);

  // Video Action Modal state
  const [actionVideo, setActionVideo] = useState<VideoItem | null>(null);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);

  // Selection & Clipboard state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [clipboardState, setClipboardState] = useState<ClipboardState>({ mode: null, items: [] });

  useEffect(() => {
    const unsubscribe = preferenceService.subscribe((newPrefs) => {
      setPrefs(newPrefs);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to fileManagerService clipboard state
  useEffect(() => {
    const unsubscribe = fileManagerService.subscribe((state) => {
      setClipboardState(state);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to mediaStore to auto-update if a video in this folder is deleted
  useEffect(() => {
    const unsubscribe = mediaStore.subscribe(() => {
      const folder = getFolder(id, name) || getFolder(rawIdStr, name);
      if (folder) {
        setVideos(folder.videos);
      }
    });
    return () => unsubscribe();
  }, [id, rawIdStr, name, getFolder]);

  // 1. Initialize videos from mediaStore cache or scan fallback
  useEffect(() => {
    async function loadFolderVideos() {
      if (name) {
        navigation.setOptions({ title: name });
      }

      const cachedFolder = getFolder(id, name) || getFolder(rawIdStr, name);
      if (cachedFolder) {
        setVideos(cachedFolder.videos);
        navigation.setOptions({ title: cachedFolder.name });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const folders = await mediaStore.scan(false);
        const currentFolder =
          getFolder(id, name) ||
          getFolder(rawIdStr, name) ||
          folders.find((f) => f.id === id || f.id === rawIdStr || (name && f.name.toLowerCase() === name.toLowerCase()));
        if (currentFolder) {
          setVideos(currentFolder.videos);
          navigation.setOptions({ title: currentFolder.name });
        }
      } catch (err) {
        console.error('Error fetching folder videos:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFolderVideos();
  }, [id, rawIdStr, name, navigation, getFolder]);

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

  // Set up header right search icon button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={toggleSearch}
          style={{ padding: 6, marginRight: 4 }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Search folder videos"
        >
          <Ionicons
            name={isSearchExpanded ? 'close-circle-outline' : 'search-outline'}
            size={22}
            color={isSearchExpanded ? '#f43f5e' : '#F3C64F'}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, toggleSearch, isSearchExpanded]);

  // 2. Filter & sort folder videos
  const displayedVideos = useMemo(() => {
    return sortAndFilterVideos(videos, searchQuery, prefs.sortBy, prefs.sortOrder);
  }, [videos, searchQuery, prefs.sortBy, prefs.sortOrder]);

  // Selection Logic
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedVideoIds(new Set());
  }, []);

  // Handle hardware Back button press when in selection mode
  useEffect(() => {
    const onBackPress = () => {
      if (isSelectionMode) {
        handleCancelSelection();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isSelectionMode, handleCancelSelection]);

  // Handle header back/close icon when in selection mode
  useEffect(() => {
    if (isSelectionMode) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={handleCancelSelection}
            style={{ padding: 6, marginLeft: 4 }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#F5F7FA" />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerLeft: undefined,
      });
    }
  }, [navigation, isSelectionMode, handleCancelSelection]);



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
          if (next.size === 0) {
            setIsSelectionMode(false);
          }
          return next;
        });
      } else {
        mediaStore.setPlaybackSession(video.id, id);
        router.push({
          pathname: '/player',
          params: {
            videoId: video.id,
            folderId: id,
          },
        });
      }
    },
    [id, router, isSelectionMode]
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
    if (selectedVideoIds.size >= displayedVideos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(displayedVideos.map((v) => v.id)));
    }
  }, [displayedVideos, selectedVideoIds.size]);

  const getSelectedVideosList = useCallback((): VideoItem[] => {
    return displayedVideos.filter((v) => selectedVideoIds.has(v.id));
  }, [displayedVideos, selectedVideoIds]);

  const handleCopy = useCallback(() => {
    const selected = getSelectedVideosList();
    if (selected.length === 0) return;
    fileManagerService.setCopy(selected);
    Alert.alert('Copied to Clipboard', );
    handleCancelSelection();
  }, [getSelectedVideosList, handleCancelSelection]);

  const handleCut = useCallback(() => {
    const selected = getSelectedVideosList();
    if (selected.length === 0) return;
    fileManagerService.setCut(selected);
    Alert.alert('Cut to Clipboard', );
    handleCancelSelection();
  }, [getSelectedVideosList, handleCancelSelection]);

  const handleShare = useCallback(async () => {
    const selected = getSelectedVideosList();
    if (selected.length === 0) return;
    await fileManagerService.shareSelectedVideos(selected);
  }, [getSelectedVideosList]);

  const handleDelete = useCallback(async () => {
    const selected = getSelectedVideosList();
    if (selected.length === 0) return;
    const deleted = await fileManagerService.deleteSelectedVideos(selected);
    if (deleted) {
      handleCancelSelection();
    }
  }, [getSelectedVideosList, handleCancelSelection]);

  const handlePasteHere = useCallback(async () => {
    const targetUri = videos.length > 0 && videos[0].uri
      ? videos[0].uri.substring(0, videos[0].uri.lastIndexOf('/'))
      : '';

    if (!targetUri) {
      Alert.alert('Paste Error', 'Could not locate target folder directory path.');
      return;
    }

    const success = await fileManagerService.pasteItemsToDirectory(targetUri);
    if (success) {
      Alert.alert('Success', 'Pasted selected videos into this folder.');
    }
  }, [videos]);

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

  const renderVideoItem = useCallback(
    ({ item }: { item: VideoItem }) => (
      <VideoCard
        video={item}
        viewMode={prefs.viewMode}
        isSelectionMode={isSelectionMode}
        isSelected={selectedVideoIds.has(item.id)}
        onPress={handleVideoPress}
        onLongPress={handleVideoLongPress}
        onMenuPress={handleOpenMenu}
      />
    ),
    [prefs.viewMode, isSelectionMode, selectedVideoIds, handleVideoPress, handleVideoLongPress, handleOpenMenu]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      if (prefs.viewMode === 'grid') {
        const rowIndex = Math.floor(index / 2);
        return { length: 160, offset: 160 * rowIndex, index };
      }
      return { length: 90, offset: 90 * index, index };
    },
    [prefs.viewMode]
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      {/* Collapsible Folder Search Header */}
      {(isSearchExpanded || searchQuery.length > 0) && (
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="search" size={18} color="#F3C64F" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search videos in this folder..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setIsSearchExpanded(false);
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Control Bar: Count, View mode grid/list toggle, Sort options */}
      <LibraryControlBar
        viewMode={prefs.viewMode}
        sortBy={prefs.sortBy}
        sortOrder={prefs.sortOrder}
        totalCount={displayedVideos.length}
        onToggleViewMode={handleToggleViewMode}
        onOpenSortModal={() => setShowSortModal(true)}
        onToggleSortOrder={handleToggleSortOrder}
      />

      {/* Video FlatList */}
      <FlatList
        key={prefs.viewMode}
        data={displayedVideos}
        keyExtractor={(item) => item.id}
        numColumns={prefs.viewMode === 'grid' ? 2 : 1}
        renderItem={renderVideoItem}
        contentContainerStyle={
          displayedVideos.length === 0 ? styles.emptyListContainer : styles.listContent
        }
        getItemLayout={getItemLayout}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="film-outline" size={56} color="rgba(212, 175, 55, 0.18)" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? 'No Results Found' : 'Folder is Empty'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {searchQuery
                ? `No videos match "${searchQuery}".`
                : 'There are no playable video files in this folder.'}
            </Text>
          </View>
        }
      />

      {/* Selection Action Bar */}
      {isSelectionMode && (
        <SelectionActionBar
          selectedCount={selectedVideoIds.size}
          totalCount={displayedVideos.length}
          onSelectAllToggle={handleSelectAllToggle}
          onCopy={handleCopy}
          onCut={handleCut}
          onShare={handleShare}
          onDelete={handleDelete}
          onCancel={handleCancelSelection}
        />
      )}

      {/* Floating Paste Bar */}
      {clipboardState.mode && clipboardState.items.length > 0 && !isSelectionMode && (
        <View style={[styles.floatingPasteContainer, { backgroundColor: colors.surface, borderColor: colors.primaryLight }]}>
          <TouchableOpacity
            style={styles.floatingPasteBtn}
            onPress={handlePasteHere}
            activeOpacity={0.8}
          >
            <Ionicons name="clipboard-outline" size={20} color="#F3C64F" />
            <Text style={styles.floatingPasteText}>
              Paste / Move {clipboardState.items.length} item{clipboardState.items.length > 1 ? 's' : ''} here ({clipboardState.mode.toUpperCase()})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingCancelBtn}
            onPress={() => fileManagerService.clearClipboard()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Options Modal */}
      <SortModal
        visible={showSortModal}
        sortBy={prefs.sortBy}
        sortOrder={prefs.sortOrder}
        onSelectSortBy={handleSelectSortBy}
        onSelectSortOrder={(order) => preferenceService.updatePreferences({ sortOrder: order })}
        onClose={() => setShowSortModal(false)}
      />

      {/* Video Context Actions Sheet */}
      <VideoActionModal
        visible={showActionModal}
        video={actionVideo}
        onClose={() => setShowActionModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08090C',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10131A',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F5F7FA',
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: 24,
    paddingHorizontal: 14,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#08090C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F7FA',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  floatingPasteContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 14,
    left: 14,
    right: 14,
    backgroundColor: '#10131A',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#F3C64F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 15,
  },
  floatingPasteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingPasteText: {
    color: '#F3C64F',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
  floatingCancelBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
