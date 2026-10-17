import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar as RNStatusBar,
  useWindowDimensions,
  AppState,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Video, {
  VideoRef,
  OnLoadData,
  OnProgressData,
  OnBufferData,
  OnVideoErrorData,
  SelectedTrackType,
} from 'react-native-video';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, useNavigation, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mediaStore } from '../services/mediaStore';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { playbackHistoryService } from '../services/playbackHistoryService';
import { PlayerTopBar } from '../components/player/PlayerTopBar';
import { PlayerBottomBar } from '../components/player/PlayerBottomBar';
import { PlayerGestureIndicators } from '../components/player/PlayerGestureIndicators';
import { PlayerTrackModal } from '../components/player/PlayerTrackModal';
import { PlayerErrorView } from '../components/player/PlayerErrorView';
import { PlayerLoadingOverlay } from '../components/player/PlayerLoadingOverlay';
import { PlayerResumePrompt } from '../components/player/PlayerResumePrompt';
import { PlayerSpeedModal } from '../components/player/PlayerSpeedModal';
import { PlayerSubtitleOverlay } from '../components/player/PlayerSubtitleOverlay';
import { pickExternalSubtitleFile, ExternalSubtitleTrack } from '../services/subtitleService';

import * as ScreenOrientation from 'expo-screen-orientation';

let Brightness: typeof import('expo-brightness') | null = null;
try {
  Brightness = require('expo-brightness');
} catch (e) {
  console.warn('ExpoBrightness native module not found in current dev client build.');
}

let VolumeManagerModule: typeof import('react-native-volume-manager') | null = null;
try {
  VolumeManagerModule = require('react-native-volume-manager');
} catch (e) {
  console.warn('VolumeManager native module not found in current dev client build.');
}

interface TrackInfo {
  index: number;
  title?: string;
  language?: string;
  type?: string;
}

export default function VideoPlayerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    videoId?: string;
    folderId?: string;
    videoUri?: string;
    title?: string;
    duration?: string;
  }>();

  const { playback, nextVideo, prevVideo } = useMediaLibrary();
  const videoRef = useRef<VideoRef>(null);

  // Active Video State
  const [activeVideo, setActiveVideo] = useState<{ id: string; uri: string; title: string } | null>(null);
  const [resolving, setResolving] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Playback state
  const [paused, setPaused] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(parseFloat(params.duration || '0'));
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Saved resume position state
  const [resumePosition, setResumePosition] = useState<number>(0);
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);

  // Advanced Playback Session Settings (Persists across track changes during session)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);
  const [showSpeedModal, setShowSpeedModal] = useState<boolean>(false);

  // MX Player Pro features: Aspect Ratio, Decoder, and Screen Lock
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');
  const [decoderMode, setDecoderMode] = useState<'HW' | 'HW+' | 'SW'>('HW');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showLockFeedback, setShowLockFeedback] = useState<boolean>(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleOrientation = useCallback(async () => {
    try {
      const next = orientation === "portrait" ? "landscape" : "portrait";
      setOrientation(next);
      if (next === "landscape") {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    } catch (e) {
      console.warn("Could not change orientation:", e);
    }
  }, [orientation]);

  const toggleResizeMode = useCallback(() => {
    setResizeMode((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'stretch';
      return 'contain';
    });
  }, []);

  const toggleDecoderMode = useCallback(() => {
    setDecoderMode((prev) => {
      if (prev === 'HW') return 'HW+';
      if (prev === 'HW+') return 'SW';
      return 'HW';
    });
  }, []);

  const triggerLockFeedback = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    setShowLockFeedback(true);
    lockTimerRef.current = setTimeout(() => {
      setShowLockFeedback(false);
    }, 1500);
  }, []);

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayOpacity = useSharedValue(1);

  const toggleLock = useCallback(() => {
    setIsLocked((prev) => {
      const next = !prev;
      if (next) {
        setControlsVisible(false);
        overlayOpacity.value = withTiming(0, { duration: 200 });
      } else {
        setControlsVisible(true);
        overlayOpacity.value = withTiming(1, { duration: 200 });
      }
      return next;
    });
    triggerLockFeedback();
  }, [triggerLockFeedback, overlayOpacity]);

  const handleSeekRelative = useCallback((delta: number) => {
    const target = Math.max(0, Math.min(durationRef.current, currentTimeRef.current + delta));
    videoRef.current?.seek(target);
    setCurrentTime(target);
    setSeekDelta(delta);
    setShowSeekIndicator(true);
    setTimeout(() => {
      setShowSeekIndicator(false);
    }, 1000);
  }, []);

  const repeatModeRef = useRef<'off' | 'one' | 'all'>('off');
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const autoPlayNextRef = useRef<boolean>(true);
  useEffect(() => {
    autoPlayNextRef.current = autoPlayNext;
  }, [autoPlayNext]);

  const lastNavTimestampRef = useRef<number>(0);
  const guardNavigation = useCallback((action: () => void) => {
    const now = Date.now();
    if (now - lastNavTimestampRef.current < 400) {
      return;
    }
    lastNavTimestampRef.current = now;
    action();
  }, []);

  const toggleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleAutoPlayNext = useCallback(() => {
    setAutoPlayNext((prev) => !prev);
  }, []);

  const handleBackPress = useCallback(() => {
    guardNavigation(() => {
      if (activeVideoRef.current) {
        playbackHistoryService.savePosition(
          activeVideoRef.current.id,
          currentTimeRef.current,
          durationRef.current
        );
      }
      router.back();
    });
  }, [guardNavigation, router]);

  // Tracks & Selection
  const [audioTracks, setAudioTracks] = useState<TrackInfo[]>([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(undefined);
  const [showAudioModal, setShowAudioModal] = useState<boolean>(false);

  const [subtitleTracks, setSubtitleTracks] = useState<TrackInfo[]>([]);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | undefined>(undefined);
  const [showSubtitleModal, setShowSubtitleModal] = useState<boolean>(false);

  // External Subtitle (.srt / .vtt) state
  const [externalSubtitle, setExternalSubtitle] = useState<ExternalSubtitleTrack | null>(null);
  const [isExternalSubSelected, setIsExternalSubSelected] = useState<boolean>(false);
  const [activeCueText, setActiveCueText] = useState<string | null>(null);

  // Subtitle Customization & Sync Delay states
  const [subOffset, setSubOffset] = useState<number>(0);
  const [subFontSize, setSubFontSize] = useState<number>(18);
  const [subTextColor, setSubTextColor] = useState<string>('#ffffff');
  const [subBgStyle, setSubBgStyle] = useState<'glass' | 'shadow' | 'black'>('glass');

  // Gesture HUD overlays (brightnessVal: 0.0 -> 1.0, default 0.5 = 50% neutral)
  const [brightnessVal, setBrightnessVal] = useState<number>(0.5);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState<boolean>(false);

  const [volumeVal, setVolumeVal] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const prevVolumeRef = useRef<number>(0.5);

  const [showVolumeIndicator, setShowVolumeIndicator] = useState<boolean>(false);

  const [seekDelta, setSeekDelta] = useState<number>(0);
  const [showSeekIndicator, setShowSeekIndicator] = useState<boolean>(false);

  // Helper refs for real-time gesture & persistence access
  const activeVideoRef = useRef<{ id: string; uri: string; title: string } | null>(null);
  useEffect(() => {
    activeVideoRef.current = activeVideo;
  }, [activeVideo]);

  const currentTimeRef = useRef<number>(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const durationRef = useRef<number>(0);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const brightnessValRef = useRef<number>(0.5);
  useEffect(() => {
    brightnessValRef.current = brightnessVal;
  }, [brightnessVal]);

  const volumeValRef = useRef<number>(0.5);
  useEffect(() => {
    volumeValRef.current = volumeVal;
  }, [volumeVal]);

  const externalSubtitleRef = useRef<ExternalSubtitleTrack | null>(null);
  useEffect(() => {
    externalSubtitleRef.current = externalSubtitle;
  }, [externalSubtitle]);

  const isExternalSubSelectedRef = useRef<boolean>(false);
  useEffect(() => {
    isExternalSubSelectedRef.current = isExternalSubSelected;
  }, [isExternalSubSelected]);

  const subOffsetRef = useRef<number>(0);
  useEffect(() => {
    subOffsetRef.current = subOffset;
  }, [subOffset]);

  const handleChangeSubOffset = useCallback((delta: number, reset = false) => {
    if (reset) {
      setSubOffset(0);
    } else {
      setSubOffset((prev) => parseFloat((prev + delta).toFixed(1)));
    }
  }, []);

  const isLockedRef = useRef<boolean>(false);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const lastSaveProgressTimeRef = useRef<number>(0);

  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // Helper to reset video-specific states when switching videos
  const resetVideoSpecificState = useCallback(() => {
    setAudioTracks([]);
    setSelectedAudioIndex(undefined);
    setSubtitleTracks([]);
    setSelectedSubtitleIndex(undefined);
    setExternalSubtitle(null);
    setIsExternalSubSelected(false);
    setActiveCueText(null);
    setSubOffset(0);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    setHasLoaded(false);
    setHasError(false);
    setErrorMessage('');
    setShowSeekIndicator(false);
    setShowBrightnessIndicator(false);
    setShowVolumeIndicator(false);
    setShowResumePrompt(false);
    setResumePosition(0);
  }, []);

  // 1. AppState listener & unmount persistence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (activeVideoRef.current) {
          playbackHistoryService.savePosition(
            activeVideoRef.current.id,
            currentTimeRef.current,
            durationRef.current
          );
          playbackHistoryService.forceSaveDisk().catch(() => {});
        }
      }
    });

    return () => {
      subscription.remove();
      if (activeVideoRef.current) {
        playbackHistoryService.savePosition(
          activeVideoRef.current.id,
          currentTimeRef.current,
          durationRef.current
        );
        playbackHistoryService.forceSaveDisk().catch(() => {});
      }
    };
  }, []);

  // 2. Orientation & Hardware Controls Lifecycle
  useEffect(() => {
    // Always start locked in portrait when entering player
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

    async function initDeviceControls() {
      if (VolumeManagerModule?.VolumeManager) {
        try {
          const vol = await VolumeManagerModule.VolumeManager.getVolume();
          setVolumeVal(typeof vol === "number" ? vol : vol.volume);
        } catch (e) {
          console.warn("Error reading volume:", e);
        }
      }
      if (Brightness) {
        try {
          const sysBrightness = await Brightness.getBrightnessAsync();
          if (typeof sysBrightness === "number" && !isNaN(sysBrightness)) {
            setBrightnessVal(sysBrightness);
          }
        } catch (e) {
          console.warn("Error reading brightness:", e);
        }
      }
    }
    initDeviceControls();

    return () => {
      // Restore portrait orientation when leaving player
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // Check saved position history for a video
  const checkResumeHistory = useCallback((targetVidId: string, dur: number) => {
    const history = playbackHistoryService.getHistoryEntry(targetVidId);
    if (
      history &&
      !history.completed &&
      history.position > 5 &&
      (dur === 0 || history.position < dur * 0.95)
    ) {
      setResumePosition(history.position);
      setShowResumePrompt(true);
      setPaused(true);
    } else {
      setShowResumePrompt(false);
      setResumePosition(0);
    }
  }, []);

  const sessionInitializedRef = useRef<boolean>(false);

  // 3. Resolve target video and initialize playback session
  const resolveVideoSession = useCallback(async () => {
    if (sessionInitializedRef.current) {
      return;
    }
    sessionInitializedRef.current = true;

    setResolving(true);
    resetVideoSpecificState();

    const targetVideoId = params.videoId;
    const targetFolderId = params.folderId;

    if (targetVideoId) {
      let video = mediaStore.getVideo(targetVideoId);
      if (!video) {
        await mediaStore.scan(false);
        video = mediaStore.getVideo(targetVideoId);
      }

      if (video) {
        mediaStore.setPlaybackSession(video.id, targetFolderId || video.folderId);
        setActiveVideo({ id: video.id, uri: video.uri, title: video.title || video.filename });
        const dur = video.duration || 0;
        setDuration(dur);
        setResolving(false);
        checkResumeHistory(video.id, dur);
        return;
      }
    }

    if (params.videoUri) {
      const vidId = params.videoId || 'temp_uri';
      mediaStore.setPlaybackSession(vidId, targetFolderId, params.videoUri);
      setActiveVideo({
        id: vidId,
        uri: params.videoUri,
        title: params.title || 'Video Player',
      });
      setResolving(false);
      checkResumeHistory(vidId, parseFloat(params.duration || '0'));
      return;
    }

    const currentPState = mediaStore.getState().playback;
    if (currentPState.currentVideoId) {
      const storeVid = mediaStore.getVideo(currentPState.currentVideoId);
      if (storeVid) {
        setActiveVideo({ id: storeVid.id, uri: storeVid.uri, title: storeVid.title || storeVid.filename });
        const dur = storeVid.duration || 0;
        setDuration(dur);
        setResolving(false);
        checkResumeHistory(storeVid.id, dur);
        return;
      }
    }

    setResolving(false);
  }, [params.videoId, params.folderId, params.videoUri, params.title, params.duration, resetVideoSpecificState, checkResumeHistory]);

  useEffect(() => {
    resolveVideoSession();
  }, [resolveVideoSession]);

  // Resume prompt action handlers
  const handleResumePress = useCallback(() => {
    if (resumePosition > 0) {
      videoRef.current?.seek(resumePosition);
      setCurrentTime(resumePosition);
    }
    setShowResumePrompt(false);
    setPaused(false);
  }, [resumePosition]);

  const handleStartOverPress = useCallback(() => {
    if (activeVideo) {
      playbackHistoryService.clearPosition(activeVideo.id);
    }
    videoRef.current?.seek(0);
    setCurrentTime(0);
    setShowResumePrompt(false);
    setPaused(false);
  }, [activeVideo]);

  // 4. Auto-hide Controls timer
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setControlsVisible(true);
    overlayOpacity.value = withTiming(1, { duration: 200 });

    if (!paused) {
      hideControlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
        overlayOpacity.value = withTiming(0, { duration: 300 });
      }, 3500);
    }
  }, [paused, overlayOpacity]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [paused, resetHideTimer]);

  const toggleControls = useCallback(() => {
    if (isLocked) {
      triggerLockFeedback();
      return;
    }
    if (controlsVisible) {
      setControlsVisible(false);
      overlayOpacity.value = withTiming(0, { duration: 250 });
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    } else {
      resetHideTimer();
    }
  }, [isLocked, triggerLockFeedback, controlsVisible, resetHideTimer, overlayOpacity]);

  const togglePlayPause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      if (next && activeVideoRef.current) {
        playbackHistoryService.savePosition(
          activeVideoRef.current.id,
          currentTimeRef.current,
          durationRef.current
        );
      }
      return next;
    });
    resetHideTimer();
  }, [resetHideTimer]);

  // 5. Video Event Handlers & Throttled Progress Persistence
  const handleLoadStart = () => {
    setIsBuffering(true);
    setHasError(false);
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setIsBuffering(false);
    setHasLoaded(true);

    try {
      if (data.audioTracks && Array.isArray(data.audioTracks) && data.audioTracks.length > 0) {
        const parsedAudio = data.audioTracks.map((t: any, idx: number) => ({
          index: typeof t.index === 'number' ? t.index : idx,
          title: t.title || t.name,
          language: t.language,
          type: t.type,
          selected: t.selected,
        }));
        setAudioTracks(parsedAudio);

        const defaultSelected = parsedAudio.findIndex((t: any) => t.selected);
        if (defaultSelected >= 0) {
          setSelectedAudioIndex(parsedAudio[defaultSelected].index);
        } else {
          setSelectedAudioIndex(parsedAudio[0].index);
        }
      } else {
        setAudioTracks([]);
        setSelectedAudioIndex(undefined);
      }
    } catch (e) {
      console.warn('[VideoPlayer] Error parsing audio tracks:', e);
      setAudioTracks([]);
      setSelectedAudioIndex(undefined);
    }

    try {
      if (data.textTracks && Array.isArray(data.textTracks) && data.textTracks.length > 0) {
        const parsedSubtitles = data.textTracks.map((t: any, idx: number) => ({
          index: typeof t.index === 'number' ? t.index : idx,
          title: t.title || t.name,
          language: t.language,
          type: t.type,
          selected: t.selected,
        }));
        setSubtitleTracks(parsedSubtitles);

        const defaultSelectedSub = parsedSubtitles.findIndex((t: any) => t.selected);
        if (defaultSelectedSub >= 0) {
          setSelectedSubtitleIndex(parsedSubtitles[defaultSelectedSub].index);
        } else {
          setSelectedSubtitleIndex(undefined);
        }
      } else {
        setSubtitleTracks([]);
        setSelectedSubtitleIndex(undefined);
      }
    } catch (e) {
      console.warn('[VideoPlayer] Error parsing subtitle tracks:', e);
      setSubtitleTracks([]);
      setSelectedSubtitleIndex(undefined);
    }

    if (activeVideoRef.current && data.duration > 0) {
      checkResumeHistory(activeVideoRef.current.id, data.duration);
    }
  };

  const handleSelectAudioTrack = useCallback((index: number | undefined) => {
    try {
      if (index !== undefined && audioTracks.length > 0) {
        const exists = audioTracks.some((t) => t.index === index);
        if (exists) {
          setSelectedAudioIndex(index);
        } else {
          console.warn('[VideoPlayer] Audio track index out of bounds:', index);
          setSelectedAudioIndex(audioTracks[0]?.index);
        }
      } else {
        setSelectedAudioIndex(undefined);
      }
    } catch (err) {
      console.error('[VideoPlayer] Error selecting audio track:', err);
      setSelectedAudioIndex(undefined);
    }
  }, [audioTracks]);

  const handlePickExternalSubtitle = useCallback(async () => {
    const sub = await pickExternalSubtitleFile();
    if (sub && sub.cues.length > 0) {
      setExternalSubtitle(sub);
      setIsExternalSubSelected(true);
      setSelectedSubtitleIndex(undefined);
    }
  }, []);

  const handleSelectSubtitleTrack = useCallback((index: number | undefined) => {
    try {
      if (index === -999) {
        setIsExternalSubSelected(true);
        setSelectedSubtitleIndex(undefined);
        return;
      }

      setIsExternalSubSelected(false);
      setActiveCueText(null);

      if (index !== undefined && subtitleTracks.length > 0) {
        const exists = subtitleTracks.some((t) => t.index === index);
        if (exists) {
          setSelectedSubtitleIndex(index);
        } else {
          console.warn('[VideoPlayer] Subtitle track index out of bounds:', index);
          setSelectedSubtitleIndex(undefined);
        }
      } else {
        setSelectedSubtitleIndex(undefined);
      }
    } catch (err) {
      console.error('[VideoPlayer] Error selecting subtitle track:', err);
      setSelectedSubtitleIndex(undefined);
    }
  }, [subtitleTracks]);

  const handleBuffer = (data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  };

  const handleReadyForDisplay = () => {
    setIsBuffering(false);
    setHasLoaded(true);
  };

  const handleError = (err: OnVideoErrorData) => {
    console.error('[VideoPlayer] Playback error:', err);
    setIsBuffering(false);
    setHasError(true);
    setErrorMessage(
      err?.error?.errorString ||
        'The video file format or codec is not supported by your device.'
    );
  };

  const handleProgress = (data: OnProgressData) => {
    if (!isSeeking) {
      setCurrentTime(data.currentTime);

      if (isExternalSubSelectedRef.current && externalSubtitleRef.current?.cues) {
        const time = data.currentTime + subOffsetRef.current;
        const cue = externalSubtitleRef.current.cues.find(
          (c) => time >= c.startTime && time <= c.endTime
        );
        setActiveCueText(cue ? cue.text : null);
      } else {
        setActiveCueText(null);
      }

      // Throttled periodic progress save (every 5 seconds)
      const now = Date.now();
      if (now - lastSaveProgressTimeRef.current > 5000 && activeVideoRef.current) {
        lastSaveProgressTimeRef.current = now;
        playbackHistoryService.savePosition(
          activeVideoRef.current.id,
          data.currentTime,
          durationRef.current
        );
      }
    }
  };

  const handleSeekSliderChange = (value: number) => {
    setIsSeeking(true);
    setCurrentTime(value);
  };

  const handleSeekSliderComplete = (value: number) => {
    setIsSeeking(false);
    videoRef.current?.seek(value);
    if (activeVideoRef.current) {
      playbackHistoryService.savePosition(
        activeVideoRef.current.id,
        value,
        durationRef.current
      );
    }
    resetHideTimer();
  };

  // Gesture Mode Ref for strict single-mode gesture locking
  type GestureMode = 'horizontal' | 'brightness' | 'volume' | null;
  const gestureModeRef = useRef<GestureMode>(null);
  const gestureSideRef = useRef<'left' | 'right'>('left');

  // Playlist Navigation
  const playNextVideo = useCallback(() => {
    const currentVid = activeVideoRef.current;
    const pState = mediaStore.getState().playback;
    console.log('[NEXT BUTTON] pressed');
    console.log('[NEXT BUTTON] currentVideoId=', currentVid?.id);
    console.log('[NEXT BUTTON] currentIndex=', pState.currentIndex);
    console.log('[NEXT BUTTON] playlistLength=', pState.playlist.length);

    guardNavigation(() => {
      if (activeVideoRef.current) {
        playbackHistoryService.savePosition(
          activeVideoRef.current.id,
          currentTimeRef.current,
          durationRef.current
        );
      }
      resetVideoSpecificState();
      const shouldLoop = repeatModeRef.current === 'all';
      const next = nextVideo(shouldLoop);
      const updatedPState = mediaStore.getState().playback;
      console.log('[NEXT BUTTON] nextIndex=', updatedPState.currentIndex);
      console.log('[NEXT BUTTON] nextVideoId=', next?.id);
      console.log('[NEXT BUTTON] nextVideoUri=', next?.uri);

      if (next) {
        setActiveVideo({ id: next.id, uri: next.uri, title: next.title || next.filename });
        const dur = next.duration || 0;
        setDuration(dur);
        setPaused(false);
        checkResumeHistory(next.id, dur);
      }
    });
  }, [guardNavigation, nextVideo, resetVideoSpecificState, checkResumeHistory]);

  const playPrevVideo = useCallback(() => {
    const currentVid = activeVideoRef.current;
    const pState = mediaStore.getState().playback;
    console.log('[PREVIOUS BUTTON] pressed');
    console.log('[PREVIOUS BUTTON] currentVideoId=', currentVid?.id);
    console.log('[PREVIOUS BUTTON] currentTime=', currentTimeRef.current);
    console.log('[PREVIOUS BUTTON] currentIndex=', pState.currentIndex);

    guardNavigation(() => {
      // Improved Previous behavior: If position > 3 seconds, restart current video
      if (currentTimeRef.current > 3.0) {
        console.log('[PREVIOUS BUTTON] currentTime > 3.0s -> restarting current video');
        videoRef.current?.seek(0);
        setCurrentTime(0);
        return;
      }

      if (activeVideoRef.current) {
        playbackHistoryService.savePosition(
          activeVideoRef.current.id,
          currentTimeRef.current,
          durationRef.current
        );
      }
      resetVideoSpecificState();
      const shouldLoop = repeatModeRef.current === 'all';
      const prev = prevVideo(shouldLoop);
      const updatedPState = mediaStore.getState().playback;
      console.log('[PREVIOUS BUTTON] previousIndex=', updatedPState.currentIndex);
      console.log('[PREVIOUS BUTTON] previousVideoId=', prev?.id);

      if (prev) {
        setActiveVideo({ id: prev.id, uri: prev.uri, title: prev.title || prev.filename });
        const dur = prev.duration || 0;
        setDuration(dur);
        setPaused(false);
        checkResumeHistory(prev.id, dur);
      } else {
        videoRef.current?.seek(0);
        setCurrentTime(0);
      }
    });
  }, [guardNavigation, prevVideo, resetVideoSpecificState, checkResumeHistory]);

  const handleVideoEnd = useCallback(() => {
    if (activeVideoRef.current) {
      playbackHistoryService.markCompleted(activeVideoRef.current.id, durationRef.current);
    }

    const currentRepeat = repeatModeRef.current;
    const isAutoPlay = autoPlayNextRef.current;

    if (currentRepeat === 'one') {
      videoRef.current?.seek(0);
      setCurrentTime(0);
      setPaused(false);
    } else if (currentRepeat === 'all') {
      playNextVideo();
    } else if (isAutoPlay) {
      const nextAvailable = nextVideo(false);
      if (nextAvailable) {
        if (activeVideoRef.current) {
          playbackHistoryService.savePosition(
            activeVideoRef.current.id,
            currentTimeRef.current,
            durationRef.current
          );
        }
        resetVideoSpecificState();
        setActiveVideo({
          id: nextAvailable.id,
          uri: nextAvailable.uri,
          title: nextAvailable.title || nextAvailable.filename,
        });
        const dur = nextAvailable.duration || 0;
        setDuration(dur);
        setPaused(false);
        checkResumeHistory(nextAvailable.id, dur);
      } else {
        setPaused(true);
      }
    } else {
      setPaused(true);
    }
  }, [nextVideo, playNextVideo, resetVideoSpecificState, checkResumeHistory]);

  const lastBrightnessUpdateRef = useRef<number>(0);
  const lastVolumeUpdateRef = useRef<number>(0);

  // Real Hardware Screen Brightness Setter (Sets actual mobile screen backlight, range 0.01..1.0)
  const setBrightnessThrottled = useCallback((val: number) => {
    const clampedVal = Math.max(0.01, Math.min(1.0, val));
    setBrightnessVal(clampedVal);
    setShowBrightnessIndicator(true);

    const now = Date.now();
    if (now - lastBrightnessUpdateRef.current > 50) {
      lastBrightnessUpdateRef.current = now;
      if (Brightness) {
        Brightness.setBrightnessAsync(clampedVal).catch(() => {});
      }
    }
  }, []);

  const setVolumeThrottled = useCallback((val: number, forceCommit = false) => {
    setVolumeVal(val);
    setShowVolumeIndicator(true);
    const now = Date.now();
    if (forceCommit || now - lastVolumeUpdateRef.current > 120) {
      lastVolumeUpdateRef.current = now;
      if (VolumeManagerModule?.VolumeManager) {
        VolumeManagerModule.VolumeManager.setVolume(val).catch(() => {});
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (volumeVal > 0) {
      prevVolumeRef.current = volumeVal;
      setVolumeThrottled(0, true);
      setIsMuted(true);
    } else {
      const restoreVal = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.5;
      setVolumeThrottled(restoreVal, true);
      setIsMuted(false);
    }
  }, [volumeVal, setVolumeThrottled]);

  const seekRelative = useCallback((delta: number) => {
    const dur = durationRef.current || 0;
    const cur = currentTimeRef.current || 0;
    const targetTime = Math.max(0, Math.min(dur > 0 ? dur : 86400, cur + delta));
    const actualDelta = Math.round(targetTime - cur);

    videoRef.current?.seek(targetTime);
    setCurrentTime(targetTime);
    setSeekDelta(actualDelta);
    setShowSeekIndicator(true);
    setTimeout(() => setShowSeekIndicator(false), 1000);
  }, []);

  // 6. MX Player Gestures Implementation
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);
  const initialTimeRef = useRef<number>(0);
  const activeSeekDeltaRef = useRef<number>(0);

  const singleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {
      console.log('[GESTURE] single tap');
      if (isLockedRef.current) {
        triggerLockFeedback();
        return;
      }
      toggleControls();
    });

  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((e) => {
      if (isLockedRef.current) {
        triggerLockFeedback();
        return;
      }
      const leftBoundary = SCREEN_WIDTH * 0.33;
      const rightBoundary = SCREEN_WIDTH * 0.67;

      if (e.x < leftBoundary) {
        console.log('[DOUBLE TAP] x=', e.x, 'zone=LEFT action=SEEK_BACKWARD');
        seekRelative(-10);
      } else if (e.x > rightBoundary) {
        console.log('[DOUBLE TAP] x=', e.x, 'zone=RIGHT action=SEEK_FORWARD');
        seekRelative(10);
      } else {
        console.log('[DOUBLE TAP] x=', e.x, 'zone=CENTER action=PLAY_PAUSE');
        togglePlayPause();
      }
    });

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(15)
    .onStart((e) => {
      if (isLockedRef.current) {
        triggerLockFeedback();
        return;
      }
      console.log('[GESTURE] pan start x:', e.x, 'y:', e.y);
      gestureModeRef.current = null;
      gestureSideRef.current = e.x < SCREEN_WIDTH / 2 ? 'left' : 'right';
      startYRef.current = e.y;
      activeSeekDeltaRef.current = 0;
      initialTimeRef.current = currentTimeRef.current;

      if (gestureSideRef.current === 'left') {
        startValRef.current = brightnessValRef.current;
      } else {
        startValRef.current = volumeValRef.current;
      }
    })
    .onUpdate((e) => {
      if (isLockedRef.current) {
        return;
      }
      const deltaY = startYRef.current - e.y;
      const deltaX = e.translationX;
      const absY = Math.abs(deltaY);
      const absX = Math.abs(deltaX);

      // Lock mode on threshold pass (Strict Single-Mode Lock)
      if (gestureModeRef.current === null) {
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (dist < 12) {
          return;
        }
        if (absX > absY) {
          gestureModeRef.current = 'horizontal';
        } else {
          gestureModeRef.current = gestureSideRef.current === 'left' ? 'brightness' : 'volume';
        }
        console.log('[GESTURE LOCK] Mode locked to:', gestureModeRef.current, 'side:', gestureSideRef.current);
      }

      // Execute EXCLUSIVELY based on locked mode
      if (gestureModeRef.current === 'horizontal') {
        const dur = durationRef.current || 60;
        const maxScrubRange = Math.min(180, Math.max(30, dur));
        const deltaSeconds = Math.round((deltaX / SCREEN_WIDTH) * maxScrubRange);

        const rawTarget = initialTimeRef.current + deltaSeconds;
        const clampedTarget = Math.max(0, Math.min(dur > 0 ? dur : 86400, rawTarget));
        const actualDelta = Math.round(clampedTarget - initialTimeRef.current);

        activeSeekDeltaRef.current = actualDelta;
        console.log('[GESTURE] pan update seek delta:', actualDelta);

        setSeekDelta(actualDelta);
        setShowSeekIndicator(true);
      } else if (gestureModeRef.current === 'brightness') {
        const change = (deltaY / (SCREEN_HEIGHT * 0.65));
        const newVal = Math.max(0.0, Math.min(1.0, startValRef.current + change));
        console.log('[GESTURE] pan update video brightness:', newVal.toFixed(2));
        setBrightnessThrottled(newVal);
      } else if (gestureModeRef.current === 'volume') {
        const change = deltaY / (SCREEN_HEIGHT * 0.65);
        const newVal = Math.max(0, Math.min(1, startValRef.current + change));
        console.log('[GESTURE] pan update volume:', newVal.toFixed(2));
        setVolumeThrottled(newVal, false);
      }
    })
    .onEnd(() => {
      if (isLockedRef.current) {
        return;
      }
      console.log('[GESTURE LOCK] Pan ended mode:', gestureModeRef.current);
      if (gestureModeRef.current === 'volume') {
        setVolumeThrottled(volumeValRef.current, true);
      } else if (gestureModeRef.current === 'horizontal' && activeSeekDeltaRef.current !== 0) {
        const dur = durationRef.current || 0;
        const targetTime = Math.max(
          0,
          Math.min(dur > 0 ? dur : 86400, initialTimeRef.current + activeSeekDeltaRef.current)
        );
        videoRef.current?.seek(targetTime);
        setCurrentTime(targetTime);
      }

      setShowBrightnessIndicator(false);
      setShowVolumeIndicator(false);
      setShowSeekIndicator(false);
      gestureModeRef.current = null;
    })
    .onFinalize(() => {
      gestureModeRef.current = null;
    });

  const composedGesture = Gesture.Race(
    Gesture.Exclusive(doubleTap, singleTap),
    panGesture
  );

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const activePlaylist = playback.playlist.length > 0 ? playback.playlist : mediaStore.getAllVideos();
  let currentPlaylistIndex = playback.currentIndex;
  if ((currentPlaylistIndex < 0 || currentPlaylistIndex >= activePlaylist.length) && activeVideo) {
    currentPlaylistIndex = activePlaylist.findIndex(
      (v) => v.id === activeVideo.id || v.uri === activeVideo.uri
    );
  }

  const isPrevDisabled = activePlaylist.length <= 1 && currentTime <= 3;
  const isNextDisabled = activePlaylist.length <= 1;

  if (resolving) {
    return <PlayerLoadingOverlay message="Initializing video..." />;
  }

  if (hasError || !activeVideo) {
    return (
      <PlayerErrorView
        title={!activeVideo ? 'Video Not Found' : 'Playback Failed'}
        errorMessage={
          errorMessage ||
          'The requested video could not be loaded from storage or format is unsupported.'
        }
        onRetry={resolveVideoSession}
        onBack={handleBackPress}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          orientation: orientation === "landscape" ? "landscape" : "portrait",
        }}
      />
      <RNStatusBar hidden />

      <View style={styles.playerRoot}>
        {/* Layer 1: Native Video Component Layer */}
        <Video
          key={activeVideo.id}
          ref={videoRef}
          source={{ uri: activeVideo.uri }}
          style={styles.fullVideo}
          resizeMode={resizeMode}
          paused={paused}
          rate={playbackRate}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onBuffer={handleBuffer}
          onReadyForDisplay={handleReadyForDisplay}
          onError={handleError}
          onProgress={handleProgress}
          onEnd={handleVideoEnd}
          selectedAudioTrack={
            selectedAudioIndex !== undefined
              ? { type: SelectedTrackType.INDEX, value: selectedAudioIndex }
              : undefined
          }
          selectedTextTrack={
            selectedSubtitleIndex !== undefined
              ? { type: SelectedTrackType.INDEX, value: selectedSubtitleIndex }
              : undefined
          }
        />

        {/* Layer 1.5: Optional Night Mode Dimmer Overlay (only dims below 20% for ultra-dark environments) */}
        {brightnessVal < 0.2 && (
          <View
            style={[
              styles.brightnessOverlay,
              { backgroundColor: `rgba(0, 0, 0, ${Math.min(0.7, (0.2 - brightnessVal) * 3.0)})` },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Layer 2: Gesture Interaction Layer (Middle area for taps & swipes) */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.gestureArea} collapsable={false}>
            {/* Buffering Loading Indicator (Suppressed on seeks once video has loaded) */}
            {isBuffering && !hasLoaded && <PlayerLoadingOverlay message="Loading video..." />}

            {/* Gesture Feedback HUD Overlays */}
            <PlayerGestureIndicators
              brightnessVal={brightnessVal}
              showBrightness={showBrightnessIndicator}
              volumeVal={volumeVal}
              showVolume={showVolumeIndicator}
              seekDelta={seekDelta}
              showSeek={showSeekIndicator}
              targetTime={initialTimeRef.current + seekDelta}
              isLocked={isLocked}
              showLockFeedback={showLockFeedback}
            />
          </Animated.View>
        </GestureDetector>

        {/* Custom Subtitle Overlay */}
        <PlayerSubtitleOverlay
          text={activeCueText}
          bottomOffset={controlsVisible && !isLocked ? 105 : 30}
          fontSize={subFontSize}
          textColor={subTextColor}
          bgStyle={subBgStyle}
        />

        {/* Floating Screen Unlock Button when controls are locked */}
        {(controlsVisible || isLocked) && (
          <TouchableOpacity
            style={[
              styles.floatingLeftLockBtn,
              isLocked && styles.floatingLeftLockBtnLocked,
              {
                left: Math.max(16, insets.left + 14),
              },
            ]}
            onPress={toggleLock}
            activeOpacity={0.7}
            accessibilityLabel={isLocked ? "Unlock screen controls" : "Lock screen controls"}
          >
            <MaterialCommunityIcons
              name={isLocked ? "lock" : "lock-outline"}
              size={22}
              color={isLocked ? "#F3C64F" : "#FFFFFF"}
            />
          </TouchableOpacity>
        )}

        {/* Layer 3: Controls Layer (Top interactive layer with pointerEvents box-none) */}
        {controlsVisible && !isLocked && (
          <Animated.View
            style={[styles.controlsOverlay, animatedOverlayStyle]}
            pointerEvents="box-none"
          >
            <PlayerTopBar
              title={activeVideo.title}
              insets={insets}
              hasAudioTracks={audioTracks.length > 0}
              hasSubtitleTracks={subtitleTracks.length > 0 || !!externalSubtitle}
              playbackSpeed={playbackRate}
              decoderMode={decoderMode}
              repeatMode={repeatMode}
              onToggleRepeatMode={toggleRepeatMode}
              onBack={handleBackPress}
              onOpenSpeedModal={() => {
                setShowSpeedModal(true);
                resetHideTimer();
              }}
              onOpenAudioModal={() => {
                setShowAudioModal(true);
                resetHideTimer();
              }}
              onOpenSubtitleModal={() => {
                setShowSubtitleModal(true);
                resetHideTimer();
              }}
              onToggleDecoderMode={toggleDecoderMode}
            />

            <PlayerBottomBar
              currentTime={currentTime}
              insets={insets}
              duration={duration}
              paused={paused}
              resizeMode={resizeMode}
              onTogglePlayPause={togglePlayPause}
              onToggleResizeMode={toggleResizeMode}
              onSeekChange={handleSeekSliderChange}
              onSeekComplete={handleSeekSliderComplete}
              isPrevDisabled={isPrevDisabled}
              isNextDisabled={isNextDisabled}
              onPrev={() => {
                playPrevVideo();
                resetHideTimer();
              }}
              onNext={() => {
                playNextVideo();
                resetHideTimer();
              }}
              onToggleOrientation={() => {
                toggleOrientation();
                resetHideTimer();
              }}
              isMuted={isMuted || volumeVal === 0}
              onToggleMute={() => {
                toggleMute();
                resetHideTimer();
              }}
            />
          </Animated.View>
        )}

        {/* Resume Prompt Overlay */}
        <PlayerResumePrompt
          visible={showResumePrompt}
          position={resumePosition}
          onResume={handleResumePress}
          onStartOver={handleStartOverPress}
        />
      </View>

      {/* Track & Speed Selection Modals */}
      <PlayerSpeedModal
        visible={showSpeedModal}
        currentSpeed={playbackRate}
        onSelectSpeed={(speed) => {
          console.log('[PLAYER BUTTON] speed selected:', speed);
          setPlaybackRate(speed);
          resetHideTimer();
        }}
        onClose={() => setShowSpeedModal(false)}
      />

      <PlayerTrackModal
        visible={showAudioModal}
        title="Audio"
        tracks={audioTracks}
        selectedIndex={selectedAudioIndex}
        onSelectTrack={(idx) => {
          console.log('[PLAYER BUTTON] audio track selected:', idx);
          handleSelectAudioTrack(idx);
        }}
        onClose={() => setShowAudioModal(false)}
      />

      <PlayerTrackModal
        visible={showSubtitleModal}
        title="Subtitles"
        tracks={subtitleTracks}
        selectedIndex={selectedSubtitleIndex}
        allowOff
        externalSubtitleName={externalSubtitle?.filename}
        isExternalSelected={isExternalSubSelected}
        subOffset={subOffset}
        subFontSize={subFontSize}
        subTextColor={subTextColor}
        subBgStyle={subBgStyle}
        onPickExternalSubtitle={handlePickExternalSubtitle}
        onSelectTrack={(idx) => {
          console.log('[PLAYER BUTTON] subtitle track selected:', idx);
          handleSelectSubtitleTrack(idx);
        }}
        onChangeSubOffset={handleChangeSubOffset}
        onChangeSubFontSize={setSubFontSize}
        onChangeSubTextColor={setSubTextColor}
        onChangeSubBgStyle={setSubBgStyle}
        onClose={() => setShowSubtitleModal(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playerRoot: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  fullVideo: {
    ...StyleSheet.absoluteFill,
  },
  brightnessOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  gestureArea: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 10,
  },
  floatingLeftLockBtn: {
    position: 'absolute',
    top: '46%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 35,
    elevation: 15,
  },
  floatingLeftLockBtnLocked: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderColor: 'rgba(243, 198, 79, 0.5)',
  },
  floatingLockContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 20,
    elevation: 20,
  },
  floatingLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 33, 23, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    shadowColor: '#F3C64F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  floatingLockText: {
    color: '#F5F7FA',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
});
