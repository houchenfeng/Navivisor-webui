import { useState } from 'react';
import { BookOpenText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'navivisor-topic-primer-seen';

const steps = [
  {
    title: '1. 写下模糊的研究领域',
    body: '研究方向常常来自导师给定的方向，或你自己感兴趣的领域，例如三维重建、语义分割、视频异常检测。请把这个领域填进「研究方向」（必填）。补充信息写在「研究目标或上下文」里，例如「和大模型结合」「做遥感场景的语义分割」，用来限定范围。',
  },
  {
    title: '2. 看清研究态势，选出一个课题',
    body: 'AI 会生成 OpenAlex 检索式，并给出第一批相关文献。你可以据此了解热点方向、竞争较激烈的方向、长期常青的主题，以及相对空白。随后会得到三个交叉研究候选课题，请选择最中意的一个。细化后的课题需要带上具体场景或创新点，例如「基于时空事件图谱的近实时交通视频异常检测」。',
  },
  {
    title: '3. 找到核心文献，衔接实验',
    body: '确定课题后，AI 会继续查找最相关的参考文献及可获取的全文。这些文献可用于开题报告中的相关工作，也是实验方案的主要来源。进入实验模块后，还可以借助 AI 梳理常用数据集、通用评价指标，以及作为改进基础的 baseline、对比方法和可能的算法创新点。',
  },
] as const;

export function TopicPrimerDialog() {
  const [open, setOpen] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9dbf8] bg-white px-3 py-1.5 text-xs font-bold text-[#1F4DCB] transition hover:bg-[#f3f8ff]"
      >
        <BookOpenText className="size-3.5" />
        查看开题教程
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="scrollbar-hide max-h-[85vh] overflow-y-auto border border-[#c9dbf8] bg-[#f7fbff] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-[#102f72]">开题教程</DialogTitle>
            <DialogDescription className="text-base font-medium leading-7 text-[#315a98]">
              从模糊的研究想法，到带具体场景和创新点的课题。关闭后，可随时点「查看开题教程」再次打开。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[#c9dbf8] bg-white px-3.5 py-3 text-sm leading-6 text-[#526e98]">
            <p className="font-extrabold text-[#183b70]">文献从哪来？</p>
            <p className="mt-1.5">
              本模块用 <strong className="text-[#1f4dcb]">OpenAlex</strong> 做公开试检索：它是开放的学术文献图谱，适合先了解领域里已有哪些论文。
              <strong className="text-[#1f4dcb]"> Google 学术</strong>覆盖广、好上手，但没有稳定公开 API，结果也更杂。
              <strong className="text-[#1f4dcb]"> Scopus</strong>（以及 Web of Science）是商业数据库，收录更严，常用于正式计量，一般需要学校图书馆账号。
              开题探索用 OpenAlex 即可；写正式报告时，再用 Scopus 或谷歌学术交叉核对。
            </p>
          </div>

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
            onClick={() => handleOpenChange(false)}
            className="mt-1 inline-flex items-center justify-center rounded-xl bg-[#1f4dcb] px-4 py-2 text-sm font-black text-white hover:bg-[#11357f]"
          >
            知道了，开始开题
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
