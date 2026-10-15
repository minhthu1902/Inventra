import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  X,
  LayoutDashboard,
  PackageSearch,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  MapPin,
  Warehouse,
  BarChart3,
  Sparkles,
  Settings,
} from "lucide-react";
import Logo from "@/components/shared/Logo";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isAvailable?: boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard, isAvailable: true }],
  },
  {
    title: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: PackageSearch, isAvailable: true },
      { label: "Inbound", href: "/inbound", icon: ArrowDownToLine },
      { label: "Outbound", href: "/outbound", icon: ArrowUpFromLine },
      { label: "Transfers", href: "/transfers", icon: Repeat },
    ],
  },
  {
    title: "Warehouse",
    items: [
      { label: "Locations", href: "/locations", icon: MapPin },
      { label: "Warehouses", href: "/warehouses", icon: Warehouse },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "AI Investigator", href: "/ai-investigator", icon: Sparkles },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-primary-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-gradient-to-b from-primary-900 to-primary-800 text-white/70 transition-[transform,visibility] duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:visible ${
          isOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
          {navSections.map((section, index) => (
            <div key={section.title ?? `section-${index}`}>
              {section.title && (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  {section.title}
                </p>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavEntry item={item} isActive={item.href === pathname} onNavigate={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="px-3 text-[11px] leading-4 text-white/45">
            Sections marked &quot;Soon&quot; will be available in a future version.
          </p>
        </nav>

        <div className="m-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <div className="leading-tight">
              <p className="text-sm font-medium text-white">Inventra</p>
              <p className="text-[11px] text-white/45">Smarter Inventory. Stronger Operations.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavEntry({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate: () => void }) {
  const Icon = item.icon;

  if (!item.isAvailable) {
    return (
      <span
        aria-disabled="true"
        title="Available in a future version"
        className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white/40"
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4" />
          {item.label}
        </span>
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/55">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? "bg-primary-600 text-white hover:bg-primary-700" : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
