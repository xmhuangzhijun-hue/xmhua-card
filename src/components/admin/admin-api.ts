"use client";

import { apiUrl } from "@/lib/api-client";

export class AdminApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly detail?: unknown) {
    super(code);
  }
}

/** Every admin call carries the session cookie; no key is ever held in the page. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AdminApiError(response.status, payload.error ?? "REQUEST_FAILED", payload.detail);
  return payload.data as T;
}

export const adminApi = {
  me: () => request<{ username: string; kind: string }>("/api/auth/me"),
  login: (username: string, password: string) =>
    request<{ username: string; displayName: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, nextPassword: string) =>
    request<{ ok: boolean }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, nextPassword }),
    }),

  overview: () => request<Overview>("/api/admin/overview"),
  settings: () => request<Record<string, unknown>>("/api/admin/settings"),
  saveSettings: (value: unknown) =>
    request<Record<string, unknown>>("/api/admin/settings", { method: "PUT", body: JSON.stringify(value) }),

  list: <T>(collection: string) => request<T[]>(`/api/admin/${collection}`),
  create: <T>(collection: string, value: unknown) =>
    request<T>(`/api/admin/${collection}`, { method: "POST", body: JSON.stringify(value) }),
  update: <T>(collection: string, id: number, value: unknown) =>
    request<T>(`/api/admin/${collection}/${id}`, { method: "PUT", body: JSON.stringify(value) }),
  remove: (collection: string, id: number) =>
    request<{ ok: boolean }>(`/api/admin/${collection}/${id}`, { method: "DELETE" }),
  reorder: <T>(collection: string, ids: number[]) =>
    request<T[]>(`/api/admin/${collection}/reorder`, { method: "POST", body: JSON.stringify({ ids }) }),
};

export type Overview = {
  tenant: { slug: string; name: string };
  counts: {
    articles: number;
    articlesPublished: number;
    products: number;
    directory: number;
    socials: number;
    pages: number;
  };
  unfinished: {
    emptyArticleBodies: string[];
    placeholderProducts: string[];
    placeholderSocials: string[];
    placeholderDirectory: string[];
  };
};

/** Turns API error codes into something the site owner can act on. */
export function describeError(error: unknown) {
  if (!(error instanceof AdminApiError)) return error instanceof Error ? error.message : "未知错误";
  switch (error.code) {
    case "INVALID_CREDENTIALS": return "用户名或密码不正确。";
    case "UNAUTHORIZED": return "登录已失效，请重新登录。";
    case "SLUG_TAKEN": return "这个链接地址已经被另一条记录占用，换一个。";
    case "INVALID_BODY": return `有字段没填对：${summarizeDetail(error.detail)}`;
    case "INVALID_JSON": return "提交内容不是合法数据。";
    case "SETTINGS_NOT_SEEDED": return "这个站点还没有初始化内容。";
    default: return error.code;
  }
}

function summarizeDetail(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "请检查必填项";
  const fields = collectFieldNames(detail as Record<string, unknown>, []);
  return fields.length > 0 ? fields.slice(0, 4).join("、") : "请检查必填项";
}

function collectFieldNames(node: Record<string, unknown>, path: string[]): string[] {
  const properties = node.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return Array.isArray(node.errors) && node.errors.length > 0 ? [path.join(".") || "内容"] : [];
  return Object.entries(properties).flatMap(([key, child]) => collectFieldNames(child, [...path, key]));
}
