const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? 'http://localhost:8180';
const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'aether';
const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'aether-dashboard';

const tokenStorageKey = 'aether.oidc.tokens';
const verifierStorageKey = 'aether.oidc.pkce.verifier';

export interface StoredTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthUser {
  subject: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
}

export function getStoredTokens(): StoredTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(tokenStorageKey);
  if (!raw) {
    return null;
  }
  const tokens = JSON.parse(raw) as StoredTokens;
  if (tokens.expiresAt <= Date.now()) {
    clearStoredTokens();
    return null;
  }
  return tokens;
}

export function getCurrentUser(tokens: StoredTokens): AuthUser | null {
  const payload = decodeJwt(tokens.idToken ?? tokens.accessToken);
  if (!payload) {
    return null;
  }
  return {
    subject: String(payload.sub),
    email: optionalString(payload.email),
    name: optionalString(payload.name),
    preferredUsername: optionalString(payload.preferred_username),
  };
}

export async function redirectToLogin() {
  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  window.sessionStorage.setItem(verifierStorageKey, verifier);

  const redirectUri = `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const verifier = window.sessionStorage.getItem(verifierStorageKey);
  if (!verifier) {
    throw new Error('Missing PKCE verifier. Start login again.');
  }

  const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      code,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Keycloak token exchange failed');
  }

  const body = await response.json() as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
  };
  const tokens: StoredTokens = {
    accessToken: body.access_token,
    idToken: body.id_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
  window.localStorage.setItem(tokenStorageKey, JSON.stringify(tokens));
  window.sessionStorage.removeItem(verifierStorageKey);
  return tokens;
}

export function clearStoredTokens() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(tokenStorageKey);
  window.sessionStorage.removeItem(verifierStorageKey);
}

function createCodeVerifier() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function createCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array) {
  const value = window.btoa(String.fromCharCode(...bytes));
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeJwt(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}
