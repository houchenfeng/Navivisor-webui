interface GuideBubbleProps {
  text: string;
  position?: 'right' | 'left' | 'top' | 'bottom';
  className?: string;
}

export default function GuideBubble({ text, position = 'right', className }: GuideBubbleProps) {
  const positionClasses: Record<string, string> = {
    right: '-right-2 top-1/2 -translate-y-1/2 translate-x-full',
    left: '-left-2 top-1/2 -translate-y-1/2 -translate-x-full',
    top: '-top-2 left-1/2 -translate-x-1/2 -translate-y-full',
    bottom: '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full',
  };
  const arrowClasses: Record<string, string> = {
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-y-4 border-y-transparent border-r-[6px] border-r-[#fef3c7]',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-y-4 border-y-transparent border-l-[6px] border-l-[#fef3c7]',
    top: 'top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-[6px] border-t-[#fef3c7]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-b-[6px] border-b-[#fef3c7]',
  };
  return (
    <div className={`absolute z-30 animate-bounce whitespace-nowrap rounded-md bg-[#fef3c7] px-3 py-1.5 text-xs font-medium text-[#78350f] shadow-md ${positionClasses[position]} ${className || ''}`}>
      <span className={`absolute ${arrowClasses[position]}`} />
      {text}
    </div>
  );
}
