import { X } from 'lucide-react';

interface ScoreExplanationPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function ScoreExplanationPopup({ open, onClose }: ScoreExplanationPopupProps) {
  if (!open) return null;
  const ratingRanges = [
    { range: '6', label: 'Accept', desc: '明确接收，工作扎实有亮点', color: 'text-[#2e7d32]', bg: 'bg-[#e8f5e9]' },
    { range: '5', label: 'Weak Accept', desc: '弱接收，整体不错但有小缺陷', color: 'text-[#388e3c]', bg: 'bg-[#e8f5e9]/60' },
    { range: '4', label: 'Borderline Accept', desc: '边缘接收，需权衡优缺点', color: 'text-[#1565c0]', bg: 'bg-[#e3f2fd]' },
    { range: '3', label: 'Borderline Reject', desc: '边缘拒绝，缺陷较明显', color: 'text-[#e65100]', bg: 'bg-[#fff3e0]' },
    { range: '2', label: 'Weak Reject', desc: '弱拒绝，存在较大问题', color: 'text-[#d84315]', bg: 'bg-[#fbe9e7]' },
    { range: '1', label: 'Reject', desc: '明确拒绝，严重缺陷', color: 'text-[#c62828]', bg: 'bg-[#ffebee]' },
  ];
  return (
    <div className="fixed right-4 top-20 z-40 w-80 rounded-md border border-[#ccc] bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-[#e0e0e0] bg-[#f5f0e0] px-3 py-2">
        <h4 className="text-sm font-bold text-[#333]">CVPR Review Scoring Guide</h4>
        <button type="button" onClick={onClose} className="rounded p-0.5 text-[#666] hover:bg-white/60 hover:text-[#333]" aria-label="close"><X className="size-4" /></button>
      </div>
      <div className="max-h-[75vh] space-y-4 overflow-y-auto p-3">
        <div>
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#800000]">Rating 评分标准 (1-6)</h5>
          <div className="space-y-1.5">{ratingRanges.map((r) => (<div key={r.range} className={`flex items-center gap-2 rounded px-2 py-1.5 ${r.bg}`}><span className={`w-6 shrink-0 text-center text-sm font-bold ${r.color}`}>{r.range}</span><div className="min-w-0"><div className="text-xs font-semibold text-[#333]">{r.label}</div><div className="text-[11px] text-[#555]">{r.desc}</div></div></div>))}</div>
        </div>
        <div className="rounded border border-[#ccc] bg-[#fafafa] p-2.5">
          <h5 className="mb-2 text-xs font-bold text-[#333]">核心评审维度（按权重）</h5>
          <div className="space-y-1">{[{name:'创新性',weight:'30%'},{name:'技术深度',weight:'25%'},{name:'实验完整性',weight:'20%'},{name:'写作表达',weight:'15%'},{name:'潜在影响',weight:'10%'}].map((d) => (<div key={d.name} className="flex items-center justify-between text-[11px]"><span className="text-[#444]">{d.name}</span><span className="font-semibold text-[#800000]">{d.weight}</span></div>))}</div>
        </div>
        <div className="rounded border border-[#ccc] bg-[#fafafa] p-2.5">
          <h5 className="mb-2 text-xs font-bold text-[#333]">中稿界限说明</h5>
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p><span className="font-semibold text-[#2e7d32]">均分 ≥ 5</span>：通常接收，可能获 Highlight/Oral 提名</p>
            <p><span className="font-semibold text-[#e65100]">均分 4 - 5</span>：边缘区域，需 Rebuttal 争取</p>
            <p><span className="font-semibold text-[#c62828]">均分 &lt; 4</span>：通常拒绝</p>
            <p className="mt-2 border-t border-[#ddd] pt-2 italic text-[#666]">无严格固定分数线，最终由 Area Chair 综合所有评审意见和 Rebuttal 后决定。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
