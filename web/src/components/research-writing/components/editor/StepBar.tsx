import { cn } from "@/lib/utils";
import type { Chapter } from "@/components/research-writing/data/writing";

interface StepBarProps {
  chapters: Chapter[];
  currentId: string;
  onChange: (id: string) => void;
}

export default function StepBar({
  chapters,
  currentId,
  onChange,
}: StepBarProps) {
  const currentIndex = chapters.findIndex((c) => c.id === currentId);

  return (
    <div className="flex items-center gap-1 border-b border-blue-100 bg-white/70 px-6 py-3">
      {chapters.map((chapter, idx) => {
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;

        return (
          <div key={chapter.id} className="flex flex-1 items-center gap-1">
            <button
              onClick={() => onChange(chapter.id)}
              className="flex items-center gap-2 transition-all"
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all",
                  isActive
                    ? "bg-brand-500 text-white shadow-md"
                    : isDone
                    ? "bg-brand-100 text-brand-500"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {idx + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs transition-all",
                  isActive
                    ? "font-semibold text-brand-700"
                    : "text-ink-sub"
                )}
              >
                {chapter.zh}
              </span>
            </button>

            {idx < chapters.length - 1 && (
              <div
                className={cn(
                  "h-[2px] flex-1 rounded",
                  idx < currentIndex ? "bg-brand-300" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
