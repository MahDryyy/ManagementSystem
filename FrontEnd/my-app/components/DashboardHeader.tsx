import { Bell, HelpCircle, Search } from "lucide-react";

type DashboardHeaderProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
};

export default function DashboardHeader({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search",
}: DashboardHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-zinc-100 bg-white px-8 py-4">
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2.5 pr-4 pl-11 text-sm text-zinc-700 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div
          className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-500"
          aria-hidden
        />
      </div>
    </header>
  );
}
