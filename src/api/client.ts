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

function baseHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

/** GET avec revalidation par ETag (réponse 304 = zéro octet de corps). */
export async function apiGet<T>(path: string): Promise<T> {
  const url = API_URL + path;
  const cached = await readEtagEntry(url);

  const headers = baseHeaders();
  if (cached) headers['If-None-Match'] = cached.etag;

  const res = await fetch(url, { headers });

  if (res.status === 304 && cached) {
    return unwrap<T>(cached.body as ApiResponse<T>, 200);
  }

  const body = await parse<T>(res);
  const etag = res.headers.get('ETag');
  if (res.ok && etag) await writeEtagEntry(url, { etag, body });
  return unwrap<T>(body, res.status);
}

export async function apiSend<T>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, payload?: unknown): Promise<T> {
  const res = await fetch(API_URL + path, {
    method,
    headers: { ...baseHeaders(), 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  return unwrap<T>(await parse<T>(res), res.status);
}

/** Fichier local (photo, enregistrement vocal) à envoyer en multipart. */
export type LocalFile = { uri: string; name: string; type: string };

export async function apiUpload<T>(path: string, fields: Record<string, string>, files: Record<string, LocalFile>): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  // React Native accepte un objet { uri, name, type } à la place d'un Blob.
  for (const [key, file] of Object.entries(files)) form.append(key, file as unknown as Blob);

  const res = await fetch(API_URL + path, { method: 'POST', headers: baseHeaders(), body: form });
  return unwrap<T>(await parse<T>(res), res.status);
}

async function parse<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: 'BAD_RESPONSE', message: 'Le serveur a répondu de façon inattendue.' } };
  }
}

function unwrap<T>(body: ApiResponse<T>, status: number): T {
  if (!body.ok) throw new ApiError(body.error.code, body.error.message, status);
  return body.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Pas de connexion. Réessayez dans un instant.';
}
