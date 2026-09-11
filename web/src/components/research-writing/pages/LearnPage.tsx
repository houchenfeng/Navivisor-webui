import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabKey = "meeting" | "latex" | "format";

interface TabContent {
  key: TabKey;
  label: string;
  icon: string;
  title: string;
  body: string;
}

const TABS: TabContent[] = [
  {
    key: "meeting",
    label: "会议",
    icon: "📅",
    title: "一、 什么是学术会议？有哪些类型？",
    body: `简单来说，学术会议就是学术界交流研究成果、探讨学术问题和促进学科发展的重要平台。大家可以把它们看作是学者们的"大聚会"，在这里，科研人员会将自己的最新研究成果拿出来与大家分享、探讨，从而获取灵感并评估自己的工作。

学术会议的种类非常丰富，大家可以根据不同的维度来了解：

1. 按规模与范围划分

国际会议：吸引来自世界各地的学者，讨论全球性的学术问题和发展趋势，是了解国际前沿、建立跨国合作网络的好机会。

国内会议：主要面向本国学者，聚焦国内的学术动态和政策导向，更贴近实际，是青年学者在国内学术界崭露头角的平台。

区域性/地方会议：规模相对较小，议题更具针对性，参与门槛较低，利于深入讨论和本地化合作。

2. 按形式与功能划分

专业会议/学术年会：针对某一特定领域的专业人士，规模较大，涵盖广泛的主题，旨在分享最新研究成果和技术进展。

研讨会 (Symposiums)：规模较小，通常由几位专家围绕一个特定主题进行深入讨论和交流，形式灵活，互动性强。

工作坊 (Workshops)：一种短期、集中的培训活动，侧重于实践经验和技能培训，帮助大家掌握新方法或解决实际问题。

研究生论坛：专门为研究生和博士生提供展示成果、交流想法的平台，通常会有知名专家进行点评和指导。

3. 按参与模式划分

线下会议：最经典的形式，面对面的交流有助于建立非正式网络，茶歇间的偶然交谈往往能催生新的合作灵感。

线上/电子会议：利用网络技术突破地域限制，提高了学术交流的包容性。

混合会议：结合线下与线上优势，允许部分人亲临会场，另一部分远程接入，正逐渐成为新常态。`,
  },
  {
    key: "latex",
    label: "Latex",
    icon: "📄",
    title: "二、 LaTeX 是什么？怎么用？",
    body: `1. 什么是 LaTeX？

LaTeX（发音为"Lah-tech"或"Lay-tech"）是一种基于TeX的高品质文档排版系统。它不是像Word那样"所见即所得"的文字处理软件，而是通过纯文本文件中的命令来控制排版，最终编译生成PDF文档。

它的核心优势在于内容与样式分离，让你能专心于写作内容，而把复杂的排版工作交给系统。它在处理复杂数学公式、长文档结构、自动管理图表编号和参考文献等方面具有无可比拟的优势，是科学界和学术界事实上的标准排版工具。

2. 怎么用 LaTeX？

对于初学者，你可以按照以下步骤入门：

第一步：搭建环境

发行版（编译器）：这是LaTeX的核心引擎。推荐跨平台的 TeX Live，或者Windows下的轻量级选择 MiKTeX。

编辑器：推荐使用 VS Code（配合 LaTeX Workshop 插件）或 TeXstudio。如果你想免去配置的烦恼，可以直接使用在线平台 Overleaf，打开浏览器就能写。

第二步：理解文档结构

一个LaTeX源文件（.tex）分为两部分：

导言区：在 \\begin{document} 之前，用于设置文档类型（如 \\documentclass{article}）、加载宏包（如 \\usepackage{amsmath}）等全局设置。

正文区：在 \\begin{document} 和 \\end{document} 之间，这里是你写实际内容的地方。

第三步：掌握基础语法

命令：以反斜杠开头，如 \\section{引言} 来创建章节。

环境：用 \\begin{环境名} 和 \\end{环境名} 包裹，例如用 itemize 环境创建无序列表。

数学公式：行内公式用 $...$ 包裹，独立公式用 \\[...\\]。

第四步：编译与输出

编写好代码后，通过编译器（如 XeLaTeX，对中文支持更好）将 .tex 文件编译成漂亮的PDF。`,
  },
  {
    key: "format",
    label: "文章格式",
    icon: "📝",
    title: "三、 论文格式要求",
    body: `学术论文有严格的格式规范，这不仅是学术严谨性的体现，也方便读者快速定位信息。虽然不同学校和期刊的具体要求会有差异，但核心框架是相通的。以下是基于国家标准的通用要求：

1. 结构组成

一篇完整的论文通常包含：

前置部分：封面、题名页、中英文摘要、关键词、目录。

主体部分：引言/绪论、正文、结论。

结尾部分：参考文献、附录、致谢等。

2. 排版与页面设置

纸张与页边距：通常采用A4纸，纵向排版。页边距常见设置为上下2.54cm左右，左右2.5cm-3.17cm。

字体字号：中文正文一般为小四号宋体，英文为Times New Roman。一级标题常用三号或小三号黑体，二级标题四号黑体。

行距与段落：正文行距常设为固定值20磅或1.25-1.5倍行距，首行缩进2个字符。

3. 内容撰写规范

题名：应简明、确切，概括核心内容，中文一般不超过20-25字。

摘要：具有独立性和自含性，不加注释和评论。内容需涵盖研究目的、方法、结果和结论，突出创新点。

关键词：选取3-8个反映论文主题的专业术语，按外延层次从大到小排列。

正文：层次分明，逻辑清晰。标题层级一般不超过五级，采用"1""1.1""1.1.1"等阿拉伯数字分级编号。

图表公式：图表须有自明性，采用三线表，图题在图下，表题在表上。公式居中，编号靠右。

4. 参考文献著录

采用顺序编码制，按正文引用先后顺序用阿拉伯数字连续编号。格式需遵循国家标准（如GB/T 7714-2015），例如：

期刊：[序号] 作者. 题名[J]. 刊名, 年, 卷(期): 起止页码.

专著：[序号] 作者. 书名[M]. 出版地: 出版者, 出版年: 起止页码.`,
  },
];

export default function LearnPage() {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState<TabKey>("meeting");

  const active = TABS.find((t) => t.key === activeKey)!;

  return (
    <main className="grid min-h-screen place-items-center bg-page-bg p-6">
      <div className="flex h-[760px] w-[1080px] overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl">
        {/* 左侧 tab 导航 */}
        <aside className="flex w-[220px] flex-col border-r border-slate-100 bg-[#f4f8ff] p-5">
                    <Button
            variant="secondary"
            className="mb-2 h-[38px] w-auto self-start"
            onClick={() => navigate({ to: "/" })}
          >
            ← 返回首页
          </Button>

          <Button
            className="mb-6 h-[38px] w-auto self-start"
            onClick={() => navigate({ to: "/research/paper" })}
          >
            进入写作 →
          </Button>

          <nav className="flex flex-col gap-2.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveKey(t.key)}
                className={cn(
                  "flex items-center rounded-lg px-4 py-3 text-left font-medium transition-all",
                  activeKey === t.key
                    ? "bg-brand-100 text-brand-500"
                    : "text-ink-sub hover:bg-brand-500/5"
                )}
              >
                <span className="mr-3 text-lg">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* 右侧内容 */}
        <section className="flex-1 overflow-y-auto p-10">
          <header className="mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{active.icon}</span>
              <h2 className="text-2xl font-bold text-ink">{active.title}</h2>
            </div>
          </header>

          <div
            key={activeKey}
            className="animate-[fadeIn_.3s_ease-in-out] whitespace-pre-wrap text-[15px] leading-[1.9] text-ink"
          >
            {active.body}
          </div>
        </section>
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </main>
  );
}
