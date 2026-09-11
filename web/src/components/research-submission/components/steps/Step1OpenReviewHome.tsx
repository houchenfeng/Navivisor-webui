import { useI18n } from '../../context/I18nContext';
import { useSimulation } from '../../context/SimulationContext';
import { MOCK_NEWS, MOCK_ACTIVE_VENUES, MOCK_OPEN_VENUES, MOCK_ALL_VENUES } from '../../data/mockData';
import GuideBubble from '../../components/GuideBubble';
import { Clock } from 'lucide-react';

export default function Step1OpenReviewHome() {
  const { t } = useI18n();
  const { goToStep } = useSimulation();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* News section */}
      <div className="mb-8 border border-[#ccc] bg-white">
        <div className="flex items-center justify-between border-b border-[#ccc] px-3 py-2">
          <h2 className="text-xl font-bold text-[#333]">{t.news}</h2>
          <button className="text-xs text-[#888] hover:text-[#333]">×</button>
        </div>
        <div className="space-y-2 p-3">
          {MOCK_NEWS.map((news) => (
            <div key={news.id} className="flex items-start justify-between gap-4">
              <a href="#" className="text-[#336699] hover:underline">{news.title}</a>
              <span className="shrink-0 text-xs text-[#888]">{news.date}</span>
            </div>
          ))}
          <a href="#" className="block pt-2 text-xs text-[#336699] hover:underline">View all OpenReview news</a>
        </div>
      </div>

      {/* Active Venues + Open for Submissions */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 border-b border-[#999] pb-1 text-xl font-bold text-[#333]">{t.activeVenues}</h2>
          <ul className="space-y-1.5">
            {MOCK_ACTIVE_VENUES.map((venue) => (
              <li key={venue.id}>
                <a href="#" className="text-[#336699] hover:underline">{venue.name}</a>
              </li>
            ))}
          </ul>
          <a href="#" className="mt-3 block text-xs text-[#336699] hover:underline">Show all 1114 venues</a>
        </div>
        <div>
          <h2 className="mb-2 border-b border-[#999] pb-1 text-xl font-bold text-[#333]">{t.openForSubmissions}</h2>
          <ul className="space-y-2">
            {MOCK_OPEN_VENUES.map((venue) => (
              <li key={venue.id} className={`relative ${venue.highlight ? 'rounded-xl bg-[#fef3c7]/70 p-2 -ml-1 ring-2 ring-[#f59e0b]/50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => venue.highlight && goToStep(2)} className={`text-left text-[#336699] hover:underline ${venue.highlight ? 'text-lg font-extrabold' : ''}`}>
                    {venue.name}
                  </button>
                  {venue.highlight && <GuideBubble text={t.guideClickVenue} position="left" className="-left-1" />}
                </div>
                {venue.deadline && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-[#666]">
                    <Clock className="size-3" />
                    <span>{venue.deadline}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <a href="#" className="mt-3 block text-xs text-[#336699] hover:underline">Show all 212 venues</a>
        </div>
      </div>

      {/* All Venues */}
      <div>
        <h2 className="mb-3 border-b border-[#999] pb-1 text-xl font-bold text-[#333]">{t.allVenues}</h2>
        <div className="space-y-3 text-sm">
          {MOCK_ALL_VENUES.map((group) => (
            <div key={group.year} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-bold text-[#9a2c22]">{group.year}</span>
              {group.venues.map((v) => (
                <a key={v} href="#" onClick={(e) => { if (v === 'CVPR' && group.year === '2026') { e.preventDefault(); goToStep(2); } }} className={`${v === 'CVPR' && group.year === '2026' ? 'font-bold text-[#9a2c22]' : 'text-[#336699]'} hover:underline`}>
                  {v}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
