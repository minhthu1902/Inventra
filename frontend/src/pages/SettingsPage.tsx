import { useEffect, useState } from "react";
import { LogOut, RefreshCw, Trash2 } from "lucide-react";
import { getCurrentUser, signOut } from "@/utils/AuthApi.js";
import {
  clearCachedOfflineUser,
  clearOfflineSnapshots,
  countOfflineSnapshots,
  getActiveOfflineOwner,
  getQueueSummary,
  syncQueuedMovements,
} from "@/utils/OfflineInventory";

type Account = { id: string; name: string; email: string };

export default function SettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [cachedViews, setCachedViews] = useState(0);
  const [queue, setQueue] = useState({ pending: 0, conflicts: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isWorking, setIsWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => setAccount(user))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const ownerId = await getActiveOfflineOwner().catch(() => null);
      if (!ownerId) return;
      const [count, summary] = await Promise.all([
        countOfflineSnapshots(ownerId).catch(() => 0),
        getQueueSummary(ownerId).catch(() => ({ pending: 0, conflicts: 0 })),
      ]);
      if (!active) return;
      setCachedViews(count);
      setQueue({ pending: summary.pending, conflicts: summary.conflicts });
    })();
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      active = false;
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [refreshKey]);

  async function runAction(action: () => Promise<string>) {
    setIsWorking(true);
    setNotice("");
    setError("");
    try {
      setNotice(await action());
      setRefreshKey((key) => key + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setIsWorking(false);
    }
  }

  const syncNow = () => runAction(async () => {
    const ownerId = await getActiveOfflineOwner();
    if (!ownerId) throw new Error("Offline storage is not ready on this device.");
    await syncQueuedMovements(ownerId);
    return "Sync finished.";
  });

  const clearCache = () => runAction(async () => {
    const ownerId = await getActiveOfflineOwner();
    if (!ownerId) throw new Error("Offline storage is not ready on this device.");
    await clearOfflineSnapshots(ownerId);
    return "Cached inventory views were cleared. They will download again the next time you open each page.";
  });

  const handleSignOut = () => runAction(async () => {
    await signOut();
    await clearCachedOfflineUser().catch(() => undefined);
    window.dispatchEvent(new Event("inventra:auth-change"));
    return "Signed out.";
  });

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase text-primary-600">System</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Your account and the inventory data stored on this device.</p>
      </header>

      {error && <p className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-success/20 bg-success-bg px-4 py-3 text-sm text-success" role="status">{notice}</p>}

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Account</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-xs text-text-secondary">Name</dt><dd className="break-words font-medium text-text-primary">{account?.name ?? "—"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-text-secondary">Email</dt><dd className="break-words font-medium text-text-primary">{account?.email ?? "—"}</dd></div>
        </dl>
        <button type="button" onClick={() => void handleSignOut()} disabled={isWorking} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background disabled:opacity-60">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Offline data on this device</h2>
        <p className="mb-4 text-sm text-text-secondary">Inventra keeps recent inventory on this device so you can keep working without a connection.</p>
        <dl className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-text-secondary">Connection</dt><dd className={`font-medium ${isOnline ? "text-success" : "text-warning"}`}>{isOnline ? "Online" : "Offline"}</dd></div>
          <div><dt className="text-xs text-text-secondary">Cached views</dt><dd className="font-medium text-text-primary">{cachedViews}</dd></div>
          <div><dt className="text-xs text-text-secondary">Movements waiting to sync</dt><dd className="font-medium text-text-primary">{queue.pending}{queue.conflicts ? ` (+${queue.conflicts} need review)` : ""}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void syncNow()} disabled={isWorking || !isOnline || queue.pending === 0} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            <RefreshCw className="h-4 w-4" /> Sync now
          </button>
          <button type="button" onClick={() => void clearCache()} disabled={isWorking || cachedViews === 0} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background disabled:opacity-60">
            <Trash2 className="h-4 w-4" /> Clear cached views
          </button>
        </div>
        <p className="mt-3 text-xs text-text-secondary">Clearing cached views never removes movements that are still waiting to sync.</p>
      </section>
    </div>
  );
}
