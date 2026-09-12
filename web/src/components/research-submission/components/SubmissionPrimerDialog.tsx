import { useState } from 'react';
import { BookOpenText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const steps = [
  {
    title: '1. 选会议、看截止时间',
    body: '顶会投稿多半走 OpenReview 这类平台。先选定会议（比如 CVPR），把截稿日记清楚，别卡点才交。',
  },
  {
    title: '2. 提交论文',
    body: '上传 PDF，填标题、作者、摘要和关键词。交完会有一个投稿编号，后面都靠它认领。',
  },
  {
    title: '3. 初审（Review）',
    body: '通常 2～3 位审稿人打分并写意见。CVPR 常见 1–6 分：6 Accept、5 Weak Accept、4/3 边缘、2 Weak Reject、1 Reject。他们还会写优点、不足和问题。均分只是参考，拍板的是领域主席（Area Chair）。',
  },
  {
    title: '4. 作者回复（Rebuttal）',
    body: '你可以逐条回应审稿意见。别硬刚：先致谢，再说明终稿打算怎么改，按审稿人分组写清楚。边缘分时，一份扎实的回复往往比再吵一轮更有用。',
  },
  {
    title: '5. 最终结果',
    body: '接收常见是 Oral / Poster；拒稿也很正常。按意见改完，换会再投是常态。',
  },
] as const;

export function SubmissionPrimerDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded border border-[#9a2c22]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#9a2c22] shadow-sm transition hover:bg-[#fff8f6]"
      >
        <BookOpenText className="size-3.5" />
        投稿科普
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#9a2c22]">会议投稿大致怎么走</DialogTitle>
            <DialogDescription className="text-base font-medium leading-7 text-[#5c4033]">
              我们会按 CVPR 顶会结构呈现完整投稿流程，请和 AI 一起完成会议投稿练习。
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm leading-6 text-[#6781aa]">
            内容整理自评分说明与流程引导。本页用于投稿流程练习，与 OpenReview 或 CVPR 无关。
          </p>

          <ol className="mt-1 flex flex-col gap-3">
            {steps.map((step) => (
              <li
                key={step.title}
                className="rounded-xl border border-[#ead9d6] bg-[#fffaf8] px-3.5 py-3"
              >
                <h3 className="text-sm font-extrabold text-[#7a241c]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#5a4a42]">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-1 rounded-xl border border-[#f0e0b8] bg-[#fffbeb] px-3.5 py-3 text-sm leading-6 text-[#7c5a12]">
            <p className="font-bold">评分怎么看（简记）</p>
            <p className="mt-1">
              均分 ≥ 5 多半稳；4～5 靠 Rebuttal 争取；&lt; 4 通常难翻盘。没有死线，Area Chair
              综合审稿意见和回复再定。
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
