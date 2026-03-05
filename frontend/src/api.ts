import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function getHeaders() {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(path: string, options: RequestInit = {}) {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Contacts
  getContacts: () => request('/api/contacts'),
  addContact: (data: { name: string; phone: string; priority: number }) =>
    request('/api/contacts', { method: 'POST', body: JSON.stringify(data) }),
  deleteContact: (id: string) => request(`/api/contacts/${id}`, { method: 'DELETE' }),

  // Trips
  startTrip: (data: any) => request('/api/trips/start', { method: 'POST', body: JSON.stringify(data) }),
  endTrip: (id: string, data: any) => request(`/api/trips/${id}/end`, { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (tripId: string, data: any) =>
    request(`/api/trips/${tripId}/location`, { method: 'POST', body: JSON.stringify(data) }),
  getTrips: () => request('/api/trips'),
  getActiveTrip: () => request('/api/trips/active'),

  // Reports
  createReport: (data: any) => request('/api/reports', { method: 'POST', body: JSON.stringify(data) }),
  getReports: () => request('/api/reports'),

  // Safety Scores
  getSafetyScores: () => request('/api/safety-scores'),
  getTransportSafety: () => request('/api/safety-scores/transport'),

  // Alerts
  triggerSOS: (data: any) => request('/api/alerts/sos', { method: 'POST', body: JSON.stringify(data) }),
  getAlerts: () => request('/api/alerts'),

  // AI
  analyzeRoute: (data: any) => request('/api/ai/analyze-route', { method: 'POST', body: JSON.stringify(data) }),

  // Seed
  seed: () => request('/api/seed', { method: 'POST' }),
};
