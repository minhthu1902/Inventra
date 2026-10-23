import { Search, Bell, ChevronDown, Warehouse, LogOut, Menu } from "lucide-react";
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

      <div className="relative min-w-0 w-full max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search SKU, item, PO, SO, location..."
          aria-label="Search inventory"
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-primary-400 focus:bg-surface sm:pr-16"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary sm:block">
          ⌘ K
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
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

        <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="hidden max-w-36 leading-tight md:block">
            <p className="truncate text-sm font-medium text-text-primary">{user.name}</p>
            <p className="truncate text-[11px] text-text-secondary">{user.email}</p>
          </div>
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
