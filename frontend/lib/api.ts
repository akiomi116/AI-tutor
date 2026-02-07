// Use relative path to leverage Next.js rewrites (proxy)
// This solves CORS and Firewall issues by routing through Next.js server
const API_BASE_URL = '/api';

export const createSession = async () => {
  const res = await fetch(`${API_BASE_URL}/upload/session/new`);
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
};

export const getSessionStatus = async (sessionId: string) => {
  const res = await fetch(`${API_BASE_URL}/upload/session/${sessionId}/status`);
  if (!res.ok) throw new Error('Failed to get session status');
  return res.json();
};

export const uploadImage = async (sessionId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/upload/upload/${sessionId}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
};

export const sendChatMessage = async (message: string, sessionId?: string, imageUrl?: string, currentMissionId?: number) => {
  const res = await fetch(`${API_BASE_URL}/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      image_url: imageUrl,
      current_mission_id: currentMissionId
    }),
  });

  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
};

/* --- Plans API --- */
export const getPlans = async () => {
  const res = await fetch(`${API_BASE_URL}/plans/`);
  if (!res.ok) throw new Error('Failed to fetch plans');
  return res.json();
};

export const createPlan = async (title: string, items: { content: string, is_completed: boolean }[], target?: string) => {
  const res = await fetch(`${API_BASE_URL}/plans/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, items, target }),
  });
  if (!res.ok) throw new Error('Failed to create plan');
  return res.json();
};

export const getPlan = async (id: number) => {
  const res = await fetch(`${API_BASE_URL}/plans/${id}`);
  if (!res.ok) throw new Error('Failed to fetch plan');
  return res.json();
};

export const updatePlanItem = async (planId: number, itemId: number, isCompleted: boolean) => {
  const res = await fetch(`${API_BASE_URL}/plans/${planId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: "dummy", is_completed: isCompleted }), // server only updates is_completed for now
  });
  if (!res.ok) throw new Error('Failed to update plan item');
  return res.json();
};

/* --- Memos API --- */
export const getMemos = async () => {
  const res = await fetch(`${API_BASE_URL}/memos/`);
  if (!res.ok) throw new Error('Failed to fetch memos');
  return res.json();
};

export const createMemo = async (content: string) => {
  const res = await fetch(`${API_BASE_URL}/memos/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to create memo');
  return res.json();
};

export const deleteMemo = async (id: number) => {
  const res = await fetch(`${API_BASE_URL}/memos/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete memo');
  return true;
};

/* --- Settings API --- */
export const getSettings = async () => {
  const res = await fetch(`${API_BASE_URL}/settings/`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
};

export const updateSettings = async (learningMode: string) => {
  const res = await fetch(`${API_BASE_URL}/settings/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learning_mode: learningMode }),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
};
