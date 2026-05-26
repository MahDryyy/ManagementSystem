import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";
import type { AppRoute } from "@/lib/routes";

const BRAND_CYAN = "#00B8D9";

type NavItem = {
  label: string;
  route: AppRoute;
  icon: LucideIcon;
  badge?: number;
};

export const mainNavItems: NavItem[] = [
  { label: "Dashboard", route: "dashboard", icon: LayoutGrid, badge: 12 },
  { label: "Dashboard Pasien", route: "dashboard-pasien", icon: FileText },
  { label: "Dashboard Obat", route: "dashboard-obat", icon: MessageCircle },
  { label: "Dashboard Website", route: "dashboard-website", icon: Users },
  {
    label: "Dashboard Laporan",
    route: "dashboard-laporan",
    icon: ClipboardList,
  },
  {
    label: "Dashboard Keuangan",
    route: "dashboard-keuangan",
    icon: Banknote,
  },
  { label: "Settings", route: "settings", icon: Settings },
];

export const footerNavItems: NavItem[] = [
  { label: "Help", route: "help", icon: HelpCircle },
];

export type SidebarProps = {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  dashboardBadge?: number;
  onLogout?: () => void;
};

function NavButton({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
  onNavigate: (route: AppRoute) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.route)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        active
          ? "bg-cyan-50 text-zinc-800"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 stroke-[1.5] ${
          active ? "text-zinc-700" : "text-zinc-500"
        }`}
      />
      <span className="flex-1">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  activeRoute,
  onNavigate,
  dashboardBadge = 12,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-zinc-100 bg-white px-5 py-6">
      <div className="mb-8 px-1">
        <h1 className="text-xl font-bold tracking-tight text-zinc-800">
          AMPEL <span style={{ color: BRAND_CYAN }}>GADING</span>
        </h1>
        <p className="mt-0.5 text-[10px] font-medium tracking-[0.2em] text-zinc-400 uppercase">
          Medical Centre
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {mainNavItems.map((item) => (
          <NavButton
            key={item.route}
            item={item}
            active={activeRoute === item.route}
            badge={
              item.route === "dashboard" ? dashboardBadge : item.badge
            }
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-zinc-100 pt-4">
        {footerNavItems.map((item) => (
          <NavButton
            key={item.route}
            item={item}
            active={activeRoute === item.route}
            onNavigate={onNavigate}
          />
        ))}

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 stroke-[1.5] text-zinc-500" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
