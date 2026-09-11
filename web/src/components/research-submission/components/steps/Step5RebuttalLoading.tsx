import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSimulation } from '../../context/SimulationContext';

export default function Step5RebuttalLoading() {
  const { t } = useI18n();
  const { goToStep } = useSimulation();

  useEffect(() => {
    const timer = setTimeout(() => { goToStep(6); }, 2500);
    return () => clearTimeout(timer);
  }, [goToStep]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <Loader2 className="size-16 animate-spin text-[#9a2c22]" />
          <div className="absolute inset-0 animate-ping"><div className="size-16 rounded-full border-2 border-[#9a2c22]/30" /></div>
        </div>
        <h2 className="text-xl font-semibold text-[#333]">{t.reviewing}</h2>
        <p className="max-w-md text-center text-sm text-[#666]">Reviewers are reading your rebuttal and re-evaluating the paper. Please wait...</p>
        <div className="mt-4 flex items-center gap-2">{[0, 1, 2].map((i) => <div key={i} className="size-2.5 animate-bounce rounded-full bg-[#9a2c22]" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
      </div>
    </div>
  );
}
