"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { SessionError } from "@/types";

/** pt-BR messages for each session error code (matches the original app). */
export const SESSION_ERRORS: Record<SessionError, string> = {
  USER_DOESNT_EXIST: "Usuário não encontrado",
  INSUFFICIENT_PERMISSIONS: "Usuário sem permissão",
  WRONG_PASSWORD: "Senha incorreta",
  USER_ALREADY_EXISTS: "Usuário já existe",
};

interface LoginBody {
  username: string;
  password: string;
}

/** Login: POST /api/session. The server sets the httpOnly cookie; on success we
 *  navigate (caller does) — no token returned to JS. */
export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginBody) => apiFetch("/api/session", { method: "POST", body }),
    throwOnError: false,
  });
}

interface SignupBody {
  username: string;
  name: string;
  password: string;
}

/** Signup: POST /api/users. */
export function useSignup() {
  return useMutation({
    mutationFn: (body: SignupBody) => apiFetch("/api/users", { method: "POST", body }),
    throwOnError: false,
  });
}

/** Logout: DELETE /api/session, then hard-reload so all client state resets. */
export function useLogout() {
  return useMutation({
    mutationFn: () => apiFetch("/api/session", { method: "DELETE" }),
    onSuccess: () => {
      window.location.href = "/login";
    },
  });
}

/** Resolve a thrown `ApiError`/error into a pt-BR message for the UI. */
export function resolveSessionError(err: unknown): string {
  if (err instanceof ApiError) {
    const code = err.code as SessionError | undefined;
    if (code && code in SESSION_ERRORS) return SESSION_ERRORS[code];
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Erro inesperado ao fazer login, tente novamente";
}
