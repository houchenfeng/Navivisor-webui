import { cn } from "@/lib/utils";

interface NavItem {
  key: string;
  label: string;
  status: "done" | "active" | "todo";
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "proposal",   label: "开题", status: "done",   badge: "✓" },
  { key: "experiment", label: "实验", status: "done",   badge: "✓" },
  { key: "writing",    label: "写作", status: "active", badge: "①" },
  { key: "submission", label: "投稿", status: "todo" },
];

export default function WritingSidebar() {
  return (
    <aside className="flex w-[200px] flex-col border-r border-blue-100 bg-white/70">
      <div className="border-b border-blue-100 px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#71adf8] to-[#3f82eb] text-white">
            ▲
          </div>
          <div>
            <div className="text-sm font-bold text-brand-700">
              启航科研智能体
            </div>
            <div className="text-[10px] text-ink-sub">让研究更简单</div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all",
              item.status === "active"
                ? "bg-brand-100 font-semibold text-brand-500"
                : item.status === "done"
                ? "text-ink-sub"
                : "text-ink-sub/60"
            )}
          >
            <span>{item.label}</span>
            {item.badge && (
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full text-[10px]",
                  item.status === "active"
                    ? "bg-brand-500 text-white"
                    : item.status === "done"
                    ? "text-green-500"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}