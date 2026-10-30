import { File } from 'expo-file-system';

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

/** Le serveur n'a pas pu être joint (pas de réseau, mauvaise adresse, délai dépassé). */
export class NetworkError extends Error {}

/** fetch dont seules les pannes réseau deviennent NetworkError. */
async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    throw new NetworkError(e instanceof Error ? e.message : String(e));
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

let onSuspended: ((message: string) => void) | null = null;

/** Compte bloqué pendant que l'application est ouverte : prévenir au lieu de déconnecter sans rien dire */
export function setSuspendedHandler(handler: (message: string) => void) {
  onSuspended = handler;
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
  const res = await send(url, { headers });
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
  const res = await send(API_URL + path, { method, headers: baseHeaders({ 'Content-Type': 'application/json', ...headers }), body });
  return unwrap<T>(await parse<T>(res), res.status);
}

/** Fichier local (photo, enregistrement vocal) à envoyer en multipart. */
export type LocalFile = { uri: string; name: string; type: string };

export async function apiUpload<T>(path: string, fields: Record<string, string>, files: Record<string, LocalFile | LocalFile[]>): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  // Le fetch d'Expo (expo/fetch) refuse l'ancien objet { uri, name, type } de React Native :
  // il faut un vrai fichier (File d'expo-file-system). Plusieurs photos : photos[0], photos[1]…
  const toBlob = (f: LocalFile) => new File(f.uri) as unknown as Blob;
  for (const [key, file] of Object.entries(files)) {
    if (Array.isArray(file)) file.forEach((f, i) => form.append(`${key}[${i}]`, toBlob(f), f.name));
    else form.append(key, toBlob(file), file.name);
  }
  const res = await send(API_URL + path, { method: 'POST', headers: baseHeaders(), body: form });
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
    if (code === 'ACCOUNT_SUSPENDED' && authToken) onSuspended?.(message);
    throw new ApiError(code, message, status, fields ?? {}, extra);
  }
  return body.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (!API_CONFIGURED) {
    return useLangStore.getState().lang === 'en'
      ? 'Server address missing: restart with npx expo start --clear (or set EXPO_PUBLIC_API_URL for an online server).'
      : 'Adresse du serveur absente : relancez avec npx expo start --clear (ou indiquez EXPO_PUBLIC_API_URL pour un serveur en ligne).';
  }
  const en = useLangStore.getState().lang === 'en';
  // Seule une vraie panne réseau devient « Pas de connexion » : une autre erreur ne doit plus être masquée.
  if (!(error instanceof NetworkError)) {
    const detail = error instanceof Error ? error.message : String(error);
    return en ? `Something went wrong: ${detail}` : `Une erreur est survenue : ${detail}`;
  }
  return en ? 'No connection. Try again in a moment.' : 'Pas de connexion. Réessayez dans un instant.';
}
