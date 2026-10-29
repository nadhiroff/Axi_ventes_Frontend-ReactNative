import { API_CONFIGURED, API_URL } from '../config/env';
import { useLangStore } from '../i18n';
import { recordDataUsage } from '../lib/dataUsage';
import { readEtagEntry, writeEtagEntry } from './etagCache';
import type { ApiResponse } from './types';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

/** Appelé quand le serveur refuse le jeton (expiré ou révoqué) : la session est fermée. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': useLangStore.getState().lang, ...extra };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

/** GET avec revalidation par ETag (réponse 304 = zéro octet de corps). */
export async function apiGet<T>(path: string): Promise<T> {
  const url = API_URL + path;
  const cached = await readEtagEntry(url);
  const headers = baseHeaders(cached ? { 'If-None-Match': cached.etag } : {});
  const res = await fetch(url, { headers });
  if (res.status === 304 && cached) {
    recordDataUsage(200);
    return unwrap<T>(cached.body as ApiResponse<T>, 200);
  }
  const body = await parse<T>(res);
  const etag = res.headers.get('ETag');
  if (res.ok && etag) await writeEtagEntry(url, { etag, body });
  return unwrap<T>(body, res.status);
}

/** POST / PATCH / PUT / DELETE en JSON ; headers : par exemple Idempotency-Key pour le paiement */
export async function apiSend<T>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, payload?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  recordDataUsage(body?.length ?? 0);
  const res = await fetch(API_URL + path, { method, headers: baseHeaders({ 'Content-Type': 'application/json', ...headers }), body });
  return unwrap<T>(await parse<T>(res), res.status);
}

/** Fichier local (photo, enregistrement vocal) à envoyer en multipart. */
export type LocalFile = { uri: string; name: string; type: string };

export async function apiUpload<T>(path: string, fields: Record<string, string>, files: Record<string, LocalFile | LocalFile[]>): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  // React Native accepte un objet { uri, name, type } à la place d'un Blob ; plusieurs photos : photos[0], photos[1]…
  for (const [key, file] of Object.entries(files)) {
    if (Array.isArray(file)) file.forEach((f, i) => form.append(`${key}[${i}]`, f as unknown as Blob));
    else form.append(key, file as unknown as Blob);
  }
  const res = await fetch(API_URL + path, { method: 'POST', headers: baseHeaders(), body: form });
  return unwrap<T>(await parse<T>(res), res.status);
}

async function parse<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    const text = await res.text();
    recordDataUsage(text.length);
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: 'BAD_RESPONSE', message: 'Le serveur a répondu de façon inattendue.' } };
  }
}

function unwrap<T>(body: ApiResponse<T>, status: number): T {
  if (status === 401 && authToken) onUnauthorized?.();
  if (!body.ok) {
    const { code, message, fields, ...extra } = body.error;
    throw new ApiError(code, message, status, fields ?? {}, extra);
  }
  return body.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (!API_CONFIGURED) {
    return useLangStore.getState().lang === 'en'
      ? 'Server address missing: set EXPO_PUBLIC_API_URL in .env.local, then restart with npx expo start --clear.'
      : 'Adresse du serveur absente : renseignez EXPO_PUBLIC_API_URL dans .env.local, puis relancez avec npx expo start --clear.';
  }
  return useLangStore.getState().lang === 'en' ? 'No connection. Try again in a moment.' : 'Pas de connexion. Réessayez dans un instant.';
}
