import { ArrowLeft, MapPin, Calendar, Link as LinkIcon, Mail } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSimulation } from '../../context/SimulationContext';
import GuideBubble from '../../components/GuideBubble';

export default function Step2VenuePage() {
  const { t } = useI18n();
  const { goToStep } = useSimulation();

  return (
    <>
      <div className="w-full bg-[#e0e0e0]">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <button type="button" onClick={() => goToStep(1)} className="flex items-center gap-1 text-sm text-[#336699] hover:underline">
            <ArrowLeft className="size-4" />
            Go to CVPR 2026 homepage
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-1 text-[2.2rem] font-bold leading-tight text-[#202a3a] md:text-[3rem]">
          Conference on Computer Vision and Pattern Recognition 2026
        </h1>
        <h2 className="mb-5 text-2xl font-normal text-[#202a3a]">CVPR 2026</h2>
        <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[#5a6b7a]">
          <div className="flex items-center gap-2"><MapPin className="size-5" /><span>Denver, Colorado, United States</span></div>
          <div className="flex items-center gap-2"><Calendar className="size-5" /><span>Jun 06 2026</span></div>
          <div className="flex items-center gap-2"><LinkIcon className="size-5" /><a href="https://cvpr.thecvf.com/Conferences/2026" target="_blank" rel="noreferrer" className="text-[#336699] hover:underline">https://cvpr.thecvf.com/Conferences/2026</a></div>
        </div>
        <div className="mb-5 flex items-center gap-2 text-[#5a6b7a]">
          <Mail className="size-5" />
          <a href="mailto:cvpr_2026_pcs@computer.org" className="text-[#336699] hover:underline">cvpr_2026_pcs@computer.org</a>
        </div>
        <p className="mb-2 text-sm text-[#777]">Please see the venue website for more information.</p>
        <p className="mb-6 text-sm text-[#777]">Submission Start: Oct 16 2025 12:00AM UTC-0, Abstract Registration: Nov 07 2025 11:59AM UTC-0, Submission Deadline: Nov 14 2025 11:59AM UTC-0</p>
        <div className="relative mb-8 flex items-center border border-[#d5d5c8] bg-[#efeeda] px-3 py-2.5">
          <span className="mr-3 text-base font-semibold text-[#444]">Add:</span>
          <div className="relative inline-block">
            <button type="button" onClick={() => goToStep(3)} className="rounded-sm border-2 border-[#3a5f6b] bg-[#4a7c8a] px-4 py-1.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#3a6672]">
              CVPR 2026 Conference Submission
            </button>
            <GuideBubble text={t.guideClickSubmitBtn} position="bottom" className="mt-2" />
          </div>
        </div>
        <div>
          <div className="flex">
            <div className="rounded-t border border-b-0 border-[#ccc] bg-[#f5f0e0] px-4 py-2"><span className="text-base font-bold text-[#333]">Recent Activity</span></div>
            <div className="flex-1 border-b border-[#ccc]" />
          </div>
          <div className="border border-t-0 border-[#ccc] bg-white/60 px-4 py-6">
            <p className="italic text-[#777]">No recent activity to display.</p>
          </div>
        </div>
      </div>
    </>
  );
}
