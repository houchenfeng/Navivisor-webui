import { Search, User, Globe, ChevronDown } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export default function Header() {
  const { t, lang, toggleLang } = useI18n();
  return (
    <header className="w-full bg-[#9a2c22] text-white">
      <div className="flex items-center gap-4 px-4 py-2">
        <div className="flex items-center gap-1">
          <button type="button" className="flex items-center justify-center rounded border border-white/30 p-1 hover:bg-white/10" aria-label="menu">
            <div className="space-y-[2px]"><div className="h-[2px] w-3 bg-white" /><div className="h-[2px] w-3 bg-white" /><div className="h-[2px] w-3 bg-white" /></div>
          </button>
          <a href="#" className="text-lg font-bold tracking-tight">OpenReview<span className="text-[#f0d060]">.net</span></a>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-white/60" />
          <input type="search" placeholder={t.searchPlaceholder} className="w-full rounded-sm border border-white/20 bg-white/10 py-1 pl-7 pr-2 text-sm text-white placeholder:text-white/60 focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/40" />
        </div>
        <div className="ml-auto flex items-center gap-1 text-sm">
          <button onClick={toggleLang} className="flex items-center gap-1 rounded px-2 py-1 text-white hover:bg-white/10"><Globe className="size-4" />{lang === 'zh' ? '中 / EN' : 'EN / 中'}</button>
          <button className="rounded px-2 py-1 text-white/90 hover:bg-white/10">{t.notifications}</button>
          <button className="rounded px-2 py-1 text-white/90 hover:bg-white/10">{t.activity}</button>
          <button className="rounded px-2 py-1 text-white/90 hover:bg-white/10">{t.tasks}</button>
          <button className="flex items-center gap-1 rounded px-2 py-1 text-white/90 hover:bg-white/10"><User className="size-4" /><span>{t.username}</span><ChevronDown className="size-3" /></button>
        </div>
      </div>
      <div className="bg-[#d8d4c8] text-[11px] text-[#555]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1">
          <span>Open Peer Review</span><span>Open Publishing</span><span>Open Access</span><span>Open Discussion</span><span>Open Recommendations</span><span>Open Directory</span><span>Open API</span><span>Open Source</span>
          <a href="#" className="text-[#336699] hover:underline">Donate</a>
        </div>
      </div>
    </header>
  );
}
