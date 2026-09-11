import { useSimulation, type StepId } from '../context/SimulationContext';
import { useI18n } from '../context/I18nContext';

const STEPS: { id: StepId; label: string; labelZh: string }[] = [
  { id: 1, label: 'Homepage', labelZh: '首页' },
  { id: 2, label: 'Venue', labelZh: '会议页' },
  { id: 3, label: 'Submit', labelZh: '投稿' },
  { id: 4, label: 'Review', labelZh: '初审' },
  { id: 5, label: 'Rebuttal', labelZh: 'Rebuttal' },
  { id: 6, label: 'Result', labelZh: '结果' },
];

export default function ProgressBar() {
  const { step, goToStep } = useSimulation();
  const { lang } = useI18n();
  return (
    <div className="w-full border-b border-[#d8d4c8] bg-[#f5f0e0]/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 px-4 py-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex flex-1 items-center">
            <button type="button" onClick={() => goToStep(s.id)} className={`flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${s.id === step ? 'bg-[#9a2c22] text-white font-medium' : s.id < step ? 'text-[#2e7d32] hover:bg-[#e8e4d8]' : 'text-[#888] hover:bg-[#e8e4d8]'}`}>
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.id === step ? 'bg-white text-[#9a2c22]' : s.id < step ? 'bg-[#2e7d32] text-white' : 'bg-[#ccc] text-white'}`}>{s.id < step ? '✓' : s.id}</span>
              <span className="truncate">{lang === 'zh' ? s.labelZh : s.label}</span>
            </button>
            {idx < STEPS.length - 1 && <div className="mx-1 h-px w-2 bg-[#d8d4c8]" />}
          </div>
        ))}
      </div>
    </div>
  );
}
