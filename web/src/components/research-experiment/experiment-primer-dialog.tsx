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
    title: '1. 核对开题交接过来的核心文献',
    body: '实验从开题模块已经选定的核心参考文献出发，重点核对能打开的 PDF 全文，以及文献表是否对齐。名单和全文对不上，后面的方案和实现也会对不上。',
  },
  {
    title: '2. 整理六个创新点的完整实验方案',
    body: '文献对齐之后，会据此写出大约六个候选创新点，每一条都配上完整实验方案：对照方法（Baseline）、数据集、评价指标，以及改动位置、训练与评测协议、通过与否的标准。这一步先把“准备做什么”写清楚，还不急着上机。',
  },
  {
    title: '3. 多个创新点分开实现，留下三个最可行的',
    body: '会议论文一般需要三个完整、能独立验证的创新点，而不是把六个候选全部写进终稿。接下来可以在本机或远程服务器上执行，也可以在本模块内完成评测：把多个创新点分别实现、对照比较。并行做完之后，按收益是否稳定、实现是否划算，留下三个最可行的。',
  },
  {
    title: '4. 交出方案、结果和效果图',
    body: '筛选结束后，会给出完整实验方案、实验结果表，以及架构图、对比图一类效果图。这些材料可以直接交给写作模块，用来写方法和实验章节。',
  },
] as const;

export function ExperimentPrimerDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9dbf8] bg-white px-3 py-1.5 text-xs font-bold text-[#1F4DCB] transition hover:bg-[#f3f8ff]"
      >
        <BookOpenText className="size-3.5" />
        查看实验说明
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="scrollbar-hide max-h-[85vh] overflow-y-auto border border-[#c9dbf8] bg-[#f7fbff] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-[#102f72]">实验大概怎么走</DialogTitle>
            <DialogDescription className="text-base font-medium leading-7 text-[#315a98]">
              从开题拿到的核心文献，落到可复现方案，再真正把实验跑通。关闭之后，右上角「查看实验说明」可以再次打开。
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-1 flex flex-col gap-3">
            {steps.map((step) => (
              <li
                key={step.title}
                className="rounded-xl border border-[#d8e5f6] bg-white px-3.5 py-3"
              >
                <h3 className="text-sm font-extrabold text-[#1f4dcb]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#526e98]">{step.body}</p>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 inline-flex items-center justify-center rounded-xl bg-[#1f4dcb] px-4 py-2 text-sm font-black text-white hover:bg-[#11357f]"
          >
            知道了，开始实验
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
