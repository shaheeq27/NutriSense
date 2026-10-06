import { useAuthStore } from "@/stores/auth-store"
import type { ApiErrorBody } from "@/types"

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "")

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }

  get isUnauthorized() {
    return this.status === 401
  }
}

function isErrorBody(v: unknown): v is ApiErrorBody {
  if (!v || typeof v !== "object" || !("error" in v)) return false
  const e = (v as { error: unknown }).error
  return (
    !!e &&
    typeof e === "object" &&
    typeof (e as { message?: unknown }).message === "string"
  )
}

/** Turn a non-2xx Response into an ApiError, reading the `{error:{code,message}}` envelope when present. */
export async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    const text = await res.text()
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (isErrorBody(body)) {
    return new ApiError(
      res.status,
      body.error.code || "error",
      body.error.message,
      body.error.details,
    )
  }
  const fallback =
    res.status >= 500
      ? "Something went wrong on our side. Please try again."
      : res.statusText || "Request failed"
  return new ApiError(res.status, `http_${res.status}`, fallback)
}

export type Query = Record<string, string | number | boolean | undefined | null>

export interface RequestOptions
  extends Omit<RequestInit, "body"> {
  /** Skip attaching the bearer token. */
  query?: Query
  body?: unknown
  anonymous?: boolean
}

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  if (!query) return url
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query))
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v))
  const s = qs.toString()
  return s ? `${url}?${s}` : url
}

export async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { query, body, anonymous, headers: extra, ...init } = opts
  const headers = new Headers(extra)
  headers.set("Accept", "application/json")

  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers.set("Content-Type", "application/json")
    payload = JSON.stringify(body)
  }

  const token = anonymous ? null : useAuthStore.getState().token
  if (token) headers.set("Authorization", `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      ...init,
      headers,
      body: payload,
    })
  } catch {
    throw new ApiError(
      0,
      "network_error",
      "We couldn't reach NutriSense. Check your connection and try again.",
    )
  }

  if (!res.ok) {
    const err = await toApiError(res)
    if (err.isUnauthorized && token) useAuthStore.getState().logout()
    throw err
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
}

export function errorMessage(
  err: unknown,
  fallback = "Something went wrong.",
): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message || fallback
  return fallback
}
