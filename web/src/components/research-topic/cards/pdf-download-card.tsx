/**
 * PDF download card (T48).
 *
 * Failure reasons are listed per paper. "42 of 50 downloaded" is not actionable
 * on its own — knowing that eight failed on a Content-Type check tells the
 * operator whether to retry or to stop trusting the source.
 */
import { FileDown, FileX } from 'lucide-react';
import { StageCard, type StageStatus } from './stage-card';
import type { PdfDownloadReport } from './types';

export type PdfDownloadCardProps = {
  report: PdfDownloadReport | null;
  status: StageStatus;
  error?: string;
  onViewMarkdown?: () => void;
};

export function PdfDownloadCard({
  report,
  status,
  error,
  onViewMarkdown,
}: PdfDownloadCardProps) {
  const total = report ? report.succeeded + report.failed : 0;

  return (
    <StageCard
      title="全文下载校验"
      status={status}
      error={error}
      collapsible
      defaultOpen
      onViewMarkdown={onViewMarkdown}
    >
      {report ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#f7fbff] px-3 py-2">
              <p className="text-[10px] font-black tracking-[0.08em] text-[#8aa1c1] uppercase">
                尝试
              </p>
              <p className="mt-0.5 text-lg font-black text-[#183b70]">{total}</p>
            </div>
            <div className="rounded-xl bg-[#e8f7ef] px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-black text-[#1d7a4d]">
                <FileDown className="size-3" />
                成功
              </p>
              <p className="mt-0.5 text-lg font-black text-[#1d7a4d]">{report.succeeded}</p>
            </div>
            <div className="rounded-xl bg-[#fff1f1] px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-black text-[#b64d57]">
                <FileX className="size-3" />
                失败
              </p>
              <p className="mt-0.5 text-lg font-black text-[#b64d57]">{report.failed}</p>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-[#8aa1c1]">
            每条下载都经过「域名白名单 + Content-Type 为 PDF + 前 5 字节为 %PDF + 体积上限」四重校验；
            未通过的条目不写入 pdf/ 目录，也不会被伪装成成功。
          </p>

          {report.failures.length ? (
            <details className="rounded-xl bg-[#fff8e8] p-3">
              <summary className="cursor-pointer text-[11px] font-black text-[#8a6414]">
                失败原因（{report.failures.length} 条）
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {report.failures.map((failure) => (
                  <li
                    key={`${failure.refId}-${failure.reason}`}
                    className="text-[11px] font-semibold leading-5 text-[#a08447]"
                  >
                    · <span className="font-mono">{failure.refId}</span>：{failure.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#7892b7]">
          尚未下载全文。下载由 Python 侧打包脚本执行，未通过的条目会保留失败原因。
        </p>
      )}
    </StageCard>
  );
}
