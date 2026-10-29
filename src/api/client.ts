import { API_URL } from '../config/env';
import { readEtagEntry, writeEtagEntry } from './etagCache';
import type { ApiResponse } from './types/common';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** GET avec revalidation par ETag (réponse 304 = zéro octet de corps). */
export async function apiGet<T>(path: string): Promise<T> {
  const url = API_URL + path;
  const cached = await readEtagEntry(url);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (cached) headers['If-None-Match'] = cached.etag;

  const res = await fetch(url, { headers });

  if (res.status === 304 && cached) {
    return unwrap<T>(cached.body as ApiResponse<T>, 200);
  }

  const body = (await res.json()) as ApiResponse<T>;
  const etag = res.headers.get('ETag');
  if (res.ok && etag) await writeEtagEntry(url, { etag, body });
  return unwrap<T>(body, res.status);
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(API_URL + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return unwrap<T>((await res.json()) as ApiResponse<T>, res.status);
}

function unwrap<T>(body: ApiResponse<T>, status: number): T {
  if (!body.ok) throw new ApiError(body.error.code, body.error.message, status);
  return body.data;
}
