import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { AccountUser } from "@/components/layout/Topbar";
import { getCurrentUser } from "@/utils/AuthApi.js";

export default function AppFrame({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const verifySession = () => {
      getCurrentUser()
        .then(({ user: currentUser }) => {
          if (active) setUser(currentUser);
        })
        .catch(() => {
          if (!active) return;
          setUser(null);
          navigate("/auth", { replace: true });
        });
    };

    verifySession();
    window.addEventListener("inventra:auth-change", verifySession);
    return () => {
      active = false;
      window.removeEventListener("inventra:auth-change", verifySession);
    };
  }, [location.key, navigate]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center" role="status">
        <LoaderCircle className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Checking your session...</span>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onMenuClick={() => setIsNavOpen(true)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
