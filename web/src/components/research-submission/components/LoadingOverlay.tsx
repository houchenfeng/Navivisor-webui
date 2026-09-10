import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  text: string;
  fullscreen?: boolean;
}

export default function LoadingOverlay({ text, fullscreen = false }: LoadingOverlayProps) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-xl">
          <Loader2 className="size-10 animate-spin text-[#9a2c22]" />
          <p className="text-base font-medium text-[#333]">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-[#555]">
      <Loader2 className="size-4 animate-spin text-[#9a2c22]" />
      <span>{text}</span>
    </div>
  );
}
