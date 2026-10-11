import { API_URL } from "@/constants/config";

const API_BASE = API_URL.replace(/\/+$/, "");
const API_ORIGIN = API_URL.match(/^https?:\/\/[^/]+/)?.[0] ?? "";

/**
 * The backend returns two kinds of relative paths:
 *   "/dealer/..."  authenticated API routes (live under the API base URL)
 *   "/uploads/..." public static files (assumed to be served from the host root)
 */
export function resolveMediaUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/dealer/") ? `${API_BASE}${path}` : `${API_ORIGIN}${path}`;
}

const LOCAL_URI = /^(file|content|ph|assets-library):/i;

/** True only for an image the dealer just picked (not one already on the server). */
export const isLocalImage = (uri: string | null): uri is string =>
  !!uri && LOCAL_URI.test(uri);

/** <Image> source. Private API images (e.g. the profile photo) need the bearer token. */
export function imageSource(uri: string, accessToken: string | null) {
  if (!LOCAL_URI.test(uri) && uri.includes("/dealer/") && accessToken) {
    return { uri, headers: { Authorization: `Bearer ${accessToken}` } };
  }
  return { uri };
}
