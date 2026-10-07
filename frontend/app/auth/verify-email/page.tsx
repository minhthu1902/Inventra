"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, CircleAlert, LoaderCircle } from "lucide-react";
import Logo from "@/components/shared/Logo";
import { verifyEmail } from "@/utils/AuthApi.js";

type VerificationState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const verificationStarted = useRef(false);
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (verificationStarted.current) {
      return;
    }
    verificationStarted.current = true;

    const token = new URLSearchParams(window.location.search).get("token");
    const verification = token
      ? verifyEmail(token)
      : Promise.reject(new Error("This verification link is invalid or incomplete."));

    verification
      .then((result) => {
        setState("success");
        setMessage(result.message);
      })
      .catch((error: unknown) => {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to verify this email.");
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_15%_10%,#dceeff_0%,transparent_38%),linear-gradient(145deg,#f5f9fd_0%,#ffffff_65%,#f1f8ff_100%)] px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo textClassName="text-text-primary" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-[0_24px_64px_-36px_rgba(6,43,99,0.35)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            {state === "loading" ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : state === "success" ? (
              <BadgeCheck className="h-6 w-6" />
            ) : (
              <CircleAlert className="h-6 w-6 text-danger" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            {state === "success" ? "Email verified" : state === "error" ? "Verification failed" : "Verifying email"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary" role="status">{message}</p>
          {state === "success" && (
            <button
              type="button"
              onClick={() => router.replace("/auth")}
              className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Continue to sign in
            </button>
          )}
          {state === "error" && (
            <Link href="/auth" className="mt-6 inline-block text-sm font-semibold text-primary-700 underline">
              Return to sign in
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
