"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { Eye, EyeOff, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "@/components/ui/google-icon";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { auth } from "@/lib/firebase";
import { ensureUserDoc, authErrorMessage, homePathFor } from "@/lib/auth";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (user) router.replace(profile?.isProvider ? "/my-dashboard" : "/dashboard");
  }, [user, profile, router]);

  const explicitRedirect = () => {
    const p =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect")
        : null;
    return p && p.startsWith("/") ? p : null;
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      await ensureUserDoc(cred.user);
      router.push(explicitRedirect() ?? (await homePathFor(cred.user.uid)));
    } catch (e) {
      setError("root", { message: authErrorMessage(e) });
    }
  };

  const onGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await ensureUserDoc(cred.user);
      router.push(explicitRedirect() ?? (await homePathFor(cred.user.uid)));
    } catch (e) {
      setError("root", { message: authErrorMessage(e) });
    }
  };

  return (
    <div className="w-full max-w-sm animate-fadeIn">
      <div className="flex flex-col items-center gap-8 rounded-2xl border border-border bg-card px-6 py-12 shadow-sm">
        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <ArrowLeftRight className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your LifeSwap account
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4">
          {errors.root && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              className="pr-10"
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="-mt-1 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="mt-1 w-full" loading={isSubmitting}>
            Sign in
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
            <GoogleIcon className="size-5" />
            Continue with Google
          </Button>
        </form>

        {/* Footer */}
        <div className="flex justify-center gap-1 text-sm text-muted-foreground">
          <p>Don&apos;t have an account?</p>
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
