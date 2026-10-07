"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, MailCheck } from "lucide-react";
import Logo from "@/components/shared/Logo";
import { resendVerification, signIn, signUp } from "@/utils/AuthApi.js";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCanResend(false);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const result = await signUp({ name, email, password });
        setNotice(result.message);
        setVerificationUrl(result.verificationUrl || "");
        setCanResend(true);
        setPassword("");
        return;
      } else {
        await signIn({ email, password });
      }
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      const apiError = requestError as Error & { code?: string };
      setError(apiError instanceof Error ? apiError.message : "Unable to authenticate.");
      setCanResend(
        apiError.code === "EMAIL_NOT_VERIFIED" ||
          apiError.code === "EMAIL_DELIVERY_FAILED",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setVerificationUrl("");
    setCanResend(false);
  }

  async function handleResendVerification() {
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await resendVerification(email);
      setNotice(result.message);
      setVerificationUrl(result.verificationUrl || "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to resend verification email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_15%_10%,#dceeff_0%,transparent_38%),linear-gradient(145deg,#f5f9fd_0%,#ffffff_65%,#f1f8ff_100%)] px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo textClassName="text-text-primary" />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-7 shadow-[0_24px_64px_-36px_rgba(6,43,99,0.35)] sm:p-9">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-text-primary">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              {mode === "signin" ? "Sign in to continue to Inventra." : "Get started with your Inventra workspace."}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-background p-1" role="tablist" aria-label="Authentication">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => changeMode("signin")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === "signin" ? "bg-surface text-primary-700 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => changeMode("signup")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-surface text-primary-700 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Sign up
            </button>
          </div>

          {notice && (
            <div className="mb-5 rounded-lg border border-info/20 bg-info-bg px-3 py-3 text-sm text-text-primary" role="status">
              <p className="flex items-start gap-2">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <span>{notice}</span>
              </p>
              {verificationUrl && (
                <a className="mt-2 inline-block font-semibold text-primary-700 underline" href={verificationUrl}>
                  Verify email now
                </a>
              )}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label className="block space-y-1.5 text-sm font-medium text-text-primary">
                Name
                <input
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 font-normal outline-none placeholder:text-text-secondary/70 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </label>
            )}

            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 font-normal outline-none placeholder:text-text-secondary/70 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-text-primary">
              Password
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 pr-11 font-normal outline-none placeholder:text-text-secondary/70 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {error && (
              <p className="rounded-lg border border-danger/20 bg-danger-bg px-3 py-2.5 text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            {canResend && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-primary-100 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-70"
              >
                Resend verification email
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-text-secondary">
            Your account credentials are securely handled by Inventra.
          </p>
        </div>
      </section>
    </div>
  );
}
