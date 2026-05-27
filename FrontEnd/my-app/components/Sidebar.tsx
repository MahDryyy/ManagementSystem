import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ChevronLeft,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Settings,
  Users,
  X,
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
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  onClose: () => void;
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
      <span className="flex-1 truncate">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  activeRoute,
  onNavigate,
  mobileOpen,
  desktopCollapsed,
  onClose,
  dashboardBadge = 12,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      id="app-sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-[min(280px,85vw)] max-w-[280px] shrink-0 -translate-x-full flex-col overflow-hidden border-r border-zinc-100 bg-white px-5 py-6 shadow-lg transition-[transform,width,padding,box-shadow] duration-300 ease-in-out lg:relative lg:z-auto lg:max-w-none lg:shadow-none ${
        mobileOpen ? "translate-x-0" : ""
      } ${
        desktopCollapsed
          ? "lg:w-0 lg:max-w-0 lg:-translate-x-full lg:border-r-0 lg:px-0"
          : "lg:w-[260px] lg:translate-x-0"
      }`}
    >
      <div className="mb-8 flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-800">
            AMPEL <span style={{ color: BRAND_CYAN }}>GADING</span>
          </h1>
          <p className="mt-0.5 text-[10px] font-medium tracking-[0.2em] text-zinc-400 uppercase">
            Medical Centre
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 lg:flex"
          aria-label="Sembunyikan sidebar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
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
