interface GuideBubbleProps {
  text: string;
  position?: 'right' | 'left' | 'top' | 'bottom';
  className?: string;
}

export default function GuideBubble({ text, position = 'right', className }: GuideBubbleProps) {
  const positionClasses: Record<string, string> = {
    right: '-right-3 top-1/2 -translate-y-1/2 translate-x-full',
    left: '-left-3 top-1/2 -translate-y-1/2 -translate-x-full',
    top: '-top-3 left-1/2 -translate-x-1/2 -translate-y-full',
    bottom: '-bottom-3 left-1/2 -translate-x-1/2 translate-y-full',
  };
  const arrowClasses: Record<string, string> = {
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-y-[10px] border-y-transparent border-r-[12px] border-r-[#f59e0b]',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-y-[10px] border-y-transparent border-l-[12px] border-l-[#f59e0b]',
    top: 'top-full left-1/2 -translate-x-1/2 border-x-[10px] border-x-transparent border-t-[12px] border-t-[#f59e0b]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-x-[10px] border-x-transparent border-b-[12px] border-b-[#f59e0b]',
  };
  return (
    <div
      role="status"
      className={`absolute z-40 animate-bounce whitespace-nowrap rounded-xl border-2 border-[#f59e0b] bg-gradient-to-br from-[#fff7ed] via-[#fef3c7] to-[#fde68a] px-5 py-3 text-base font-extrabold tracking-wide text-[#7c2d12] shadow-[0_10px_28px_rgba(245,158,11,0.45)] ring-4 ring-[#fbbf24]/35 sm:text-lg ${positionClasses[position]} ${className || ''}`}
    >
      <span className={`absolute ${arrowClasses[position]}`} />
      {text}
    </div>
  );
}
