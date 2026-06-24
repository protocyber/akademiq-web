"use client";

import { getAccessToken } from "@/lib/api/client";

type AccessClaims = {
  roles?: string[];
  perms?: string[];
  role?: string;
  exp?: number;
};

function decodeJwtPayload(token: string): AccessClaims | null {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as AccessClaims;
  } catch {
    return null;
  }
}

export function getAccessClaims(): AccessClaims | null {
  if (typeof window === "undefined") return null;
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwtPayload(token);
}

export function getAccessPerms(): string[] {
  const claims = getAccessClaims();
  return Array.isArray(claims?.perms) ? claims.perms : [];
}

export function getAccessRoles(): string[] {
  const claims = getAccessClaims();
  if (Array.isArray(claims?.roles)) return claims.roles;
  return claims?.role ? [claims.role] : [];
}

export function hasAccessRole(code: string): boolean {
  return getAccessRoles().includes(code);
}

export function hasAccessPerm(code: string): boolean {
  return getAccessPerms().includes(code);
}
