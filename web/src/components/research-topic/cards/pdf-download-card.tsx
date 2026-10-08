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

/**
 * The script reports machine codes. Showing `pdf_truncated` to an operator is
 * technically honest and practically useless, so each code gets a plain
 * sentence. Codes are matched by prefix because several carry a suffix with the
 * offending value, e.g. `unexpected_content_type:text/html`.
 */
const FAILURE_LABEL: Record<string, string> = {
  http_error_401: '需要登录（401）',
  http_error_403: '无访问权限（403）',
  http_error_404: '链接失效（404）',
  http_error_410: '资源已移除（410）',
  unexpected_content_type: 'Content-Type 不是 PDF（多半是错误页或落地页）',
  invalid_pdf_content: '内容不是 PDF',
  invalid_pdf_header: '文件头不是 %PDF-（多半是 HTML 错误页）',
  pdf_too_small: '文件过小，不像真实 PDF',
  pdf_truncated: '文件被截断（缺少 %%EOF）',
  pdf_no_structure: '缺少 PDF 结构（无 /Type 或 trailer）',
  pdf_too_large: '超过体积上限',
  pdf_host_not_allowlisted: '域名不在白名单内',
  pdf_url_not_https: '非 HTTPS 链接',
  download_failed: '下载失败',
  retry_limit_reached: '重试次数用尽',
  not_open_access: '非开放获取',
  no_oa_pdf_url: '没有可用的开放获取 PDF 链接',
};

export function describeDownloadFailure(reason: string): string {
  const prefix = reason.split(':')[0];
  return FAILURE_LABEL[prefix] ?? reason;
}

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
            每条下载都要通过「HTTPS + 域名白名单 + Content-Type + %PDF 文件头 + 最小体积 + %%EOF 结尾 + PDF 结构」校验；
            任一项未过都不写入 pdf/ 目录，也不会被伪装成成功 —— 残缺文件比明确的失败更难发现。
          </p>

          {report.failures.length ? (
            <details className="rounded-xl bg-[#fff8e8] p-3">
              <summary className="cursor-pointer text-[11px] font-black text-[#8a6414]">
                失败原因（{report.failures.length} 条）
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {report.failures.map((failure) => {
                  const label = describeDownloadFailure(failure.reason);
                  // A reason already in prose would otherwise be printed twice.
                  const translated = label !== failure.reason;
                  return (
                    <li
                      key={`${failure.refId}-${failure.reason}`}
                      className="text-[11px] font-semibold leading-5 text-[#a08447]"
                    >
                      · <span className="font-mono">{failure.refId}</span>：{label}
                      {translated ? (
                        <span className="ml-1 font-mono text-[10px] text-[#b8a179]">
                          {failure.reason}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
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
