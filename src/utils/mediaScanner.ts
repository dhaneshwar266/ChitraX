import { VideoFolder } from '../types/media';
import { requestMediaPermissions as reqPermissions } from '../services/permissionService';
import { mediaStore } from '../services/mediaStore';

/**
 * Requests media library permissions from the user.
 * Delegates to centralized permissionService.
 */
export async function requestMediaPermissions(): Promise<boolean> {
  const res = await reqPermissions();
  return res.granted;
}

/**
 * Scans all video assets on the device and groups them by parent directory/album.
 * Delegates to centralized mediaStore cache / mediaScannerService.
 */
export async function fetchVideosGroupedByFolder(): Promise<VideoFolder[]> {
  return await mediaStore.scan(false);
}
