const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface LeaderboardEntry {
  name: string;
  points: number;
}

export interface RunSubmission {
  name: string;
  points: number;
}

export interface RunResponse {
  success: boolean;
  entry?: {
    id: number;
    name: string;
    points: number;
    created_at: string;
  };
  error?: string;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>('/api/leaderboard');
}

export async function submitRun(data: RunSubmission): Promise<RunResponse> {
  return request<RunResponse>('/api/run', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
