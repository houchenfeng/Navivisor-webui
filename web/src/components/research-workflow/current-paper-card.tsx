/**
 * Collapsible "current paper" card for chat / module shells (W5 / §17).
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, FileStack } from 'lucide-react';
import { useResearchProjectStore } from '@/stores/research-project-store';
import { cn } from '@/lib/utils';

export function CurrentPaperCard({ className }: { className?: string }) {
  const project = useResearchProjectStore((s) => s.project);
  const [open, setOpen] = useState(true);

  if (!project) return null;

  const shortPath =
    project.rootPath.length > 48
      ? `…${project.rootPath.slice(-46)}`
      : project.rootPath;

  return (
    <section
      className={cn(
        'rounded-2xl border border-[#d7e6fb] bg-white/90 p-3 shadow-sm backdrop-blur',
        className,
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-8 place-items-center rounded-lg bg-[#e8f0ff] text-[#1F4DCB]">
          <FileStack className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-[#173778]">
            当前论文 · {project.title}
          </p>
          <p className="truncate text-[11px] font-medium text-[#7890b6]">
            {shortPath}
          </p>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-[#7890b6]" />
        ) : (
          <ChevronDown className="size-4 text-[#7890b6]" />
        )}
      </button>
      {open ? (
        <div className="mt-2 space-y-1.5 border-t border-[#e8f0ff] pt-2 text-[11px] font-medium text-[#55739f]">
          {project.description ? <p>{project.description}</p> : null}
          <p>
            Demo：
            {project.demoComplete == null
              ? '未载入'
              : project.demoComplete
                ? '完整'
                : `部分（待补 ${project.missing?.length ?? 0} 项）`}
          </p>
          {(project.missing?.length ?? 0) > 0 ? (
            <ul className="list-disc pl-4 text-[#b45309]">
              {project.missing!.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
