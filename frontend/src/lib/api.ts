import { FASTAPI_URL } from './supabase';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${FASTAPI_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // F1 Biometric
  startSession: (data: { ip: string; user_agent: string; fingerprint_id: string; bank_id: string }) =>
    apiFetch<{ session_id: string }>('/api/session/start', { method: 'POST', body: JSON.stringify(data) }),

  inferBiometric: (events: unknown[]) =>
    apiFetch<{ session_id: string; bot_confidence: number; is_bot: boolean }>('/api/biometric/infer', {
      method: 'POST',
      body: JSON.stringify(events),
    }),

  getSessionScore: (id: string) =>
    apiFetch<{ bot_confidence: number; mitigation_action: string; is_honeypotted: boolean }>(`/api/session/${id}/score`),

  // F3 Network
  getNetworkGraph: (window = 60) => apiFetch<{ nodes: unknown[]; edges: unknown[]; clusters: unknown[] }>(`/api/network/graph?window=${window}`),
  getHeatmap: (last = 300) => apiFetch<{ arcs: unknown[] }>(`/api/network/heatmap?last=${last}`),

  // F4 Triage
  triggerTriage: (data: unknown) => apiFetch<unknown>('/api/triage/analyze', { method: 'POST', body: JSON.stringify(data) }),
  getTriageHistory: (limit = 50, bank_id?: string) =>
    apiFetch<unknown[]>(`/api/triage/history?limit=${limit}${bank_id ? `&bank_id=${bank_id}` : ''}`),
  manualTriage: (session_id: string) =>
    apiFetch<unknown>('/api/triage/manual', { method: 'POST', body: JSON.stringify({ session_id }) }),

  // F5 Honeypot
  getHoneypotIOCs: (session_id: string) => apiFetch<unknown[]>(`/api/honeypot/iocs?session_id=${session_id}`),

  // F6 Federation
  getFederationStatus: () => apiFetch<unknown>('/api/federation/status'),
  triggerFederation: (bank_id: string, reason: string) =>
    apiFetch<unknown>('/api/federation/trigger', { method: 'POST', body: JSON.stringify({ bank_id, trigger_reason: reason }) }),

  // F7 GNN
  getGNNGraph: (bank_id: string, hours = 4) => apiFetch<{ nodes: unknown[]; edges: unknown[]; rings: unknown[] }>(`/api/gnn/graph?bank_id=${bank_id}&hours=${hours}`),
  getActiveRings: () => apiFetch<unknown[]>('/api/gnn/rings?status=active'),
  seedDemo: () => apiFetch<unknown>('/api/gnn/seed_demo', { method: 'POST' }),

  // F8 Red Team (no direct API needed, reads from Supabase Realtime)
};
