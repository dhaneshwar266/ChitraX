export interface VideoItem {
  id: string;
  uri: string;
  filename: string;
  title: string;
  duration: number; // in seconds
  width?: number;
  height?: number;
  creationTime?: number;
  modificationTime?: number;
  folderId: string;
  folderName: string;
  mediaType: string;
  size?: number; // bytes if available
}

export interface VideoFolder {
  id: string;
  name: string;
  videoCount: number;
  videos: VideoItem[];
  path?: string;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PlaybackSession {
  currentVideoId: string | null;
  currentFolderId: string | null;
  playlist: VideoItem[];
  currentIndex: number;
}

export interface ScanState {
  folders: VideoFolder[];
  isScanning: boolean;
  lastScannedAt: number | null;
  permissionStatus: PermissionStatus;
  error: string | null;
  playback: PlaybackSession;
}

