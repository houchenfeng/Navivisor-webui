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
    title: '1. 标题',
    body: '标题是审稿人和读者最先读到的一句话，通常要同时点出任务、方法和场景，例如「面向监控摄像头的证据可验证视频异常检测」，而不是只写「视频异常检测」这种过大的方向。好的标题让人立刻明白这篇论文在解决什么问题、用什么思路。拟定标题时尽量具体、可检索，避免空泛形容词堆砌。',
  },
  {
    title: '2. 摘要',
    body: '摘要是一篇可以单独流传的短文，会议论文常见大约 150 到 250 词。不读正文的人也应能从中知道：研究问题是什么、方法如何工作、在哪些数据上评测、得到了怎样的主要结果。摘要不是目录，也不要写成广告口号；贡献、设定和数字要能和后文对得上。关键词则用来帮助检索，选出能代表任务与方法的专业用语即可。',
  },
  {
    title: '3. 引言',
    body: '引言负责把读者从广阔背景带到你这篇论文的具体问题。常见顺序是：这个领域为什么重要、现有做法卡在哪里、你要回答的问题如何表述、本文贡献有哪几条。引言不是把公式一次性倒出来，也不是把相关工作整章提前写完。对新手来说，写清楚「为什么现在必须做这件事」比堆砌术语更重要。',
  },
  {
    title: '4. 相关工作',
    body: '相关工作用来定位你的方法在文献地图上的位置。请按线索分组介绍最接近的研究，例如重建式检测、弱监督检测、视觉语言模型检测，并说明它们尚未覆盖的缺口，以及你与它们的具体差别。这一节不是把开题检索到的题目抄成清单。每一组文献都应该服务于一个判断：前人已经走到哪一步，你的工作从哪里接上去。',
  },
  {
    title: '5. 算法介绍',
    body: '方法章节要把系统拆成可以复述的模块：输入是什么、中间如何处理、输出有哪些。对照实验里的基线，说明你改动了哪一段、为什么这样改、关键公式在约束什么。配合架构图，让人能顺着数据流走一遍。这一节的目标是让同行理解并尝试复现思路，而不是粘贴工程代码。符号一旦出现，后文应保持一致。',
  },
  {
    title: '6. 实验结果',
    body: '实验章节用证据支撑前面的主张。需要交代数据集与划分、评价指标含义、对比方法和消融设置，再用表格与曲线给出数字。每一张主表、每一幅主图后面，建议用一两句话写出结论，例如哪一个模块主要提升了哪一项指标。数字必须和引言、方法里的承诺对应；协议（片段长度、随机种子、阈值如何选取）也要写清楚，否则别人无法判断结果是否可比较。',
  },
  {
    title: '7. 讨论和展望',
    body: '讨论用来诚实地说明方法成立的条件、仍然失败的情形，以及这些局限对实际部署意味着什么。展望则指出下一步值得推进的方向，例如更难的场景、更严格的评测、或尚未隔离清楚的模块。这一节不是再夸奖一遍自己的方法，也不是空洞地写「未来会继续努力」。把没做成的事情讲明白，往往比只报成功数字更像一篇完整论文。',
  },
  {
    title: '8. 引用文献',
    body: '正文里的判断、方法来源和对比对象，都需要指向具体文献，让读者能够核对。会议论文普遍使用 BibTeX：在 .bib 文件里登记条目，正文用引用命令插入，编译时自动生成文末列表。开题阶段整理的核心参考文献，是这一节最自然的起点；实验里真正对比过的方法也必须出现。引用数量不在多，而在每条都能支撑某个说法。',
  },
  {
    title: '9. LaTeX',
    body: 'LaTeX 是学术排版的源文件语言。CVPR 这类会议会提供官方模板，规定双栏版式、页数和图表位置。本模块会把标题、摘要到参考文献各节汇总进 main.tex，再调用本机编译器生成 PDF。对新手可以先记住：每一节对应一段源码；公式、表格、图片和参考文献都由命令生成，而不是在 Word 里手工对格式。先把内容写对，再处理编译报错，通常比一开始就微调版式更省事。',
  },
] as const;

export function WritingPrimerDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9dbf8] bg-white px-3 py-1.5 text-xs font-bold text-[#1F4DCB] transition hover:bg-[#f3f8ff]"
      >
        <BookOpenText className="size-3.5" />
        论文写作科普
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="scrollbar-hide max-h-[85vh] overflow-y-auto border border-[#c9dbf8] bg-[#f7fbff] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-[#102f72]">会议论文各节在写什么</DialogTitle>
            <DialogDescription className="text-base font-medium leading-7 text-[#315a98]">
              面向第一次写会议论文的同学：从标题、摘要一直讲到参考文献和 LaTeX。关闭之后，可随时再点「论文写作科普」。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[#c9dbf8] bg-white px-3.5 py-3 text-sm leading-6 text-[#526e98]">
            <p className="font-extrabold text-[#183b70]">这篇论文是给谁读的？</p>
            <p className="mt-1.5">
              审稿人通常会先读标题和摘要，再决定是否认真看方法和实验。因此前面几节要把问题和方法说清楚，后面几节用协议和数字把主张撑住。本模块按这个顺序带你一节一节完成，最后汇总成可编译的 LaTeX 与 PDF，交给投稿模块。
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
            onClick={() => setOpen(false)}
            className="mt-1 inline-flex items-center justify-center rounded-xl bg-[#1f4dcb] px-4 py-2 text-sm font-black text-white hover:bg-[#11357f]"
          >
            知道了，开始写作
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
