"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLogin, useSignup, resolveSessionError } from "@/queries/session";

/**
 * Login / Signup page — ported from the original Electron `pages/Login`.
 *
 * Two modes toggled by a text link. Uses TanStack Form (so Tab/Shift-Tab moves
 * between native inputs in DOM order). On successful login the server sets the
 * httpOnly cookie and we navigate to /batches.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");

  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const pending = loginMutation.isPending || signupMutation.isPending;

  const form = useForm({
    defaultValues: {
      name: "",
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setError("");
      if (mode === "signup") {
        const res = await signupMutation.mutateAsync({
          username: value.username,
          name: value.name,
          password: value.password,
        }).catch((e) => e);
        if (res instanceof Error) {
          setError(resolveSessionError(res));
          return;
        }
        toast.success("Usuário criado, solicite a liberação do acesso a um administrador");
        form.reset();
        setMode("login");
        return;
      }
      // login
      const res = await loginMutation
        .mutateAsync({ username: value.username.trim(), password: value.password })
        .catch((e) => e);
      if (res instanceof Error) {
        setError(resolveSessionError(res));
        return;
      }
      router.push("/batches");
      router.refresh();
    },
  });

  const isSignup = mode === "signup";

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Form side */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Oba Green
            </CardTitle>
            <CardDescription>
              {isSignup ? "Crie sua conta" : "Acesse sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {isSignup && (
                <form.Field name="name">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor={field.name}>Seu nome</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        autoComplete="name"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              )}

              <form.Field name="username">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>
                      {isSignup ? "Nome de usuário" : "Usuário"}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      autoComplete="username"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Senha</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={pending || !form.state.canSubmit}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isSignup ? (
                  "Cadastrar"
                ) : (
                  "Entrar"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode(isSignup ? "login" : "signup");
                }}
                className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {isSignup ? "Fazer login" : "Fazer cadastro"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Decorative side (hidden on small screens) */}
      <div className="hidden bg-primary md:block">
        <div className="flex h-full flex-col justify-end p-12 text-primary-foreground">
          <h1 className="text-4xl font-bold tracking-tight">Oba Green</h1>
          <p className="mt-2 text-primary-foreground/80">
            Gerenciador de pedidos
          </p>
        </div>
      </div>
    </div>
  );
}
