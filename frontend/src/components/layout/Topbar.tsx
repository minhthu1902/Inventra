import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, LogOut, Menu } from "lucide-react";
import { signOut } from "@/utils/AuthApi.js";
import { clearCachedOfflineUser } from "@/utils/OfflineInventory";

export type AccountUser = {
  id: string;
  name: string;
  email: string;
};

type TopbarProps = {
  user: AccountUser;
  onMenuClick: () => void;
};

export default function Topbar({ user, onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/inventory?search=${encodeURIComponent(query)}` : "/inventory");
  }

  async function handleSignOut() {
    try {
      await signOut();
      await clearCachedOfflineUser().catch(() => undefined);
      window.dispatchEvent(new Event("inventra:auth-change"));
    } catch {
      return;
    }
  }

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-3 sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        aria-controls="app-sidebar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-background lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <form role="search" onSubmit={handleSearch} className="relative min-w-0 w-full max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          maxLength={100}
          placeholder="Search SKU or item..."
          aria-label="Search inventory"
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-primary-400 focus:bg-surface"
        />
      </form>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <Link to="/settings" title="Account settings" aria-label="Account settings" className="flex items-center gap-2 rounded-lg hover:opacity-90">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
              {initials}
            </span>
            <span className="hidden max-w-36 leading-tight md:block">
              <span className="block truncate text-sm font-medium text-text-primary">{user.name}</span>
              <span className="block truncate text-[11px] text-text-secondary">{user.email}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-background hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
