const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getBrowserToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { getSupabaseBrowser } = await import('./supabaseBrowser');
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = await getBrowserToken();

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      `API error: ${response.status} ${response.statusText} for ${path}`,
    );
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};

export default apiClient;
