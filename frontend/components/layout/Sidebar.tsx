"use client";

import Link from "next/link";
import {
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
  badge?: number;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Inventory",
    items: [
      { label: "Inventory", href: "/inventory", icon: PackageSearch },
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
      { label: "AI Investigator", href: "/ai-investigator", icon: Sparkles, badge: 3 },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

const activeHref = "/";

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-primary-900 to-primary-800 text-white/70">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {navSections.map((section, index) => (
          <div key={section.title ?? `section-${index}`}>
            {section.title && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-600 text-white hover:bg-primary-700"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
  );
}
