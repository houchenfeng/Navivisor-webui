import { withBasePath } from '@/base-path';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <img
        src={withBasePath('/navivisor-logo.png')}
        alt="Navivisor"
        className="navivisor-logo size-10 shrink-0 object-contain"
      />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-[#173778] dark:text-foreground">
            Navivisor<span className="ml-1 font-bold text-[#1F4DCB] dark:text-primary">研途启航</span>
          </div>
          <div className="mt-0.5 text-[9px] font-semibold tracking-[0.2em] text-[#6884b6] uppercase dark:text-muted-foreground">
            Research navigator
          </div>
        </div>
      )}
    </div>
  );
}
