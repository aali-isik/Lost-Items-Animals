import { create } from 'axios';
import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to access host localhost.
// iOS simulator uses localhost.
// Physical device: use your computer's local IP address.
const API_HOST = Platform.OS === 'web' ? 'localhost' : '172.20.10.2';
const BASE_URL = `http://${API_HOST}:8080/api`;

const api = create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

/** Same base URL, no default Content-Type — used for multipart so boundary is set correctly. */
const apiMultipart = create({
  baseURL: BASE_URL,
  headers: {
    'Bypass-Tunnel-Reminder': 'true',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    apiMultipart.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
    delete apiMultipart.defaults.headers.common['Authorization'];
  }
};

export const getApiOrigin = () => BASE_URL.replace(/\/api$/, '');

export const resolveEventImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const origin = getApiOrigin();
  return `${origin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

// ---- Auth Endpoints ----
export const registerUser = async (registerData) => {
  const response = await api.post('/auth/register', registerData);
  return response.data;
};

export const loginUser = async (loginData) => {
  const response = await api.post('/auth/login', loginData);
  return response.data;
};

// ---- Event Endpoints ----
/**
 * @param {object} [filters]
 * @param {'LOST'|'FOUND'} [filters.listingKind]
 * @param {'ITEM'|'ANIMAL'} [filters.listingCategory]
 * @param {string} [filters.fromDate] ISO-8601
 * @param {string} [filters.toDate] ISO-8601
 * @param {string} [filters.locationContains]
 */
export const getEvents = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.listingKind) params.append('listingKind', filters.listingKind);
  if (filters.listingCategory) params.append('listingCategory', filters.listingCategory);
  if (filters.fromDate) params.append('fromDate', filters.fromDate);
  if (filters.toDate) params.append('toDate', filters.toDate);
  if (filters.locationContains?.trim()) params.append('locationContains', filters.locationContains.trim());
  const qs = params.toString();
  const response = await api.get(`/events${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const createEvent = async (eventData) => {
  const response = await api.post('/events', eventData);
  return response.data;
};

/**
 * Creates a listing with optional image (multipart). Requires auth like other /api routes.
 * @param {{ title: string, description: string, latitude: number, longitude: number, eventDate: string, listingKind: 'LOST'|'FOUND', listingCategory: 'ITEM'|'ANIMAL', locationLabel?: string, imageAsset?: { uri: string, mimeType?: string, fileName?: string } | null }} payload
 */
export const createEventWithImage = async ({
  title,
  description,
  latitude,
  longitude,
  eventDate,
  listingKind,
  listingCategory,
  locationLabel,
  imageAsset,
}) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));
  formData.append('eventDate', eventDate);
  formData.append('listingKind', listingKind);
  formData.append('listingCategory', listingCategory);
  if (locationLabel?.trim()) {
    formData.append('locationLabel', locationLabel.trim());
  }

  if (imageAsset?.uri) {
    if (Platform.OS === 'web' && String(imageAsset.uri).startsWith('blob:')) {
      const res = await fetch(imageAsset.uri);
      const blob = await res.blob();
      const ext = imageAsset.mimeType?.split('/')[1] || 'jpg';
      formData.append('image', blob, `photo.${ext}`);
    } else {
      const mime = imageAsset.mimeType || 'image/jpeg';
      const extFromMime = mime.split('/')[1] || 'jpg';
      const name = imageAsset.fileName || `photo.${extFromMime}`;
      formData.append('image', {
        uri: imageAsset.uri,
        name,
        type: mime,
      });
    }
  }

  const response = await apiMultipart.post('/events', formData);
  return response.data;
};

export const getEvent = async (id) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

export const updateEvent = async (id, eventData) => {
  const response = await api.put(`/events/${id}`, eventData);
  return response.data;
};

export const deleteEvent = async (id) => {
  await api.delete(`/events/${id}`);
};

/**
 * @param {string|number} id
 * @param {object} payload same shape as createEventWithImage
 */
export const updateEventWithImage = async (id, payload) => {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));
  formData.append('eventDate', payload.eventDate);
  formData.append('listingKind', payload.listingKind);
  formData.append('listingCategory', payload.listingCategory);
  if (payload.locationLabel?.trim()) {
    formData.append('locationLabel', payload.locationLabel.trim());
  }

  if (payload.imageAsset?.uri) {
    if (Platform.OS === 'web' && String(payload.imageAsset.uri).startsWith('blob:')) {
      const res = await fetch(payload.imageAsset.uri);
      const blob = await res.blob();
      const ext = payload.imageAsset.mimeType?.split('/')[1] || 'jpg';
      formData.append('image', blob, `photo.${ext}`);
    } else {
      const mime = payload.imageAsset.mimeType || 'image/jpeg';
      const extFromMime = mime.split('/')[1] || 'jpg';
      const name = payload.imageAsset.fileName || `photo.${extFromMime}`;
      formData.append('image', {
        uri: payload.imageAsset.uri,
        name,
        type: mime,
      });
    }
  }

  const response = await apiMultipart.put(`/events/${id}`, formData);
  return response.data;
};

// ---- Comment Endpoints ----
export const getCommentsForEvent = async (eventId) => {
  const response = await api.get(`/comments/event/${eventId}`);
  return response.data;
};

export const createComment = async (eventId, content) => {
  const response = await api.post('/comments', { eventId, content });
  return response.data;
};

export const deleteComment = async (commentId) => {
  await api.delete(`/comments/${commentId}`);
};

export default api;
