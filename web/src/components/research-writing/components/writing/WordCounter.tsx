import { countWords, checkRange } from "@/lib/wordCount";

interface Props {
  text: string;
  min: number;
  max: number;
}

export default function WordCounter({ text, min, max }: Props) {
  const { chinese, english, total } = countWords(text);
  const range = checkRange(total, min, max);

  const colorClass =
    range.status === "ok"
      ? "text-green-600"
      : range.status === "low"
      ? "text-yellow-600"
      : "text-red-600";

  const hint =
    range.status === "ok"
      ? `✓ 符合推荐（${min}-${max} 词）`
      : range.status === "low"
      ? `低于推荐（${min}-${max} 词）`
      : `超出推荐（${min}-${max} 词）`;

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-sub">
        中 <b className="text-ink">{chinese}</b> 字 · 英{" "}
        <b className="text-ink">{english}</b> 词 · 共{" "}
        <b className="text-ink">{total}</b> 词
      </span>
      <span className={`font-semibold ${colorClass}`}>{hint}</span>
    </div>
  );
}