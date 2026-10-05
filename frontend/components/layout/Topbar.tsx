"use client";

import { useEffect, useState } from "react";
import { Search, Bell, ChevronDown, Warehouse, LogOut } from "lucide-react";
import Link from "next/link";
import { getCurrentUser, signOut } from "@/utils/AuthApi.js";

type AccountUser = {
  id: string;
  name: string;
  email: string;
};

export default function Topbar() {
  const [user, setUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
      window.dispatchEvent(new Event("inventra:auth-change"));
    } catch {
      return;
    }
  }

  const initials = user?.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
      <div className="relative min-w-0 w-full max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search SKU, item, PO, SO, location..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-16 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-primary-400 focus:bg-surface"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
          ⌘ K
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary hover:bg-background"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
            3
          </span>
        </button>

        <button
          type="button"
          aria-label="Main Warehouse"
          className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm text-text-secondary hover:bg-background lg:flex"
        >
          <Warehouse className="h-4 w-4 text-text-secondary" />
          Main Warehouse
          <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
        </button>

        {user ? (
          <div className="flex items-center gap-2 border-l border-border pl-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="max-w-36 leading-tight">
              <p className="truncate text-sm font-medium text-text-primary">{user.name}</p>
              <p className="truncate text-[11px] text-text-secondary">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-background hover:text-text-primary"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            aria-label="Sign in or create an account"
            className="flex items-center gap-2 border-l border-border pl-3 hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
              ?
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-text-primary">Account</p>
              <p className="text-[11px] text-text-secondary">Sign in / Sign up</p>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
