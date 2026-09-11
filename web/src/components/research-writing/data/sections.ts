export interface Section {
  enTitle: string;
  zhTitle: string;
  en: string;
  zh: string;
}

export const sections: Record<string, Section> = {
  intro: {
    enTitle: "Introduction",
    zhTitle: "引言",
    en: "This paper studies a practical writing workflow for academic documents. We outline the motivation, the target users, and the main contributions of our bilingual editing interface.",
    zh: "本文面向学术文档写作流程，介绍研究动机、目标用户，以及双语对照编辑界面的主要贡献。",
  },
  related: {
    enTitle: "Related Work",
    zhTitle: "相关工作",
    en: "In this section, we introduce the details of each component in our framework. We discuss discriminator strategy and those function, which are crucial for achieving stable and fast learning.",
    zh: "在本部分中，我们详细介绍了框架中每个部件的基础细节，并讨论了训练策略和损失函数，这些对于实现稳定和有效的学习至关重要。",
  },
  model: {
    enTitle: "Algorithm Model",
    zhTitle: "算法模型",
    en: "We present the overall model architecture, including the encoder, decoder, and alignment module used to keep English drafts and Chinese translations consistent.",
    zh: "本节给出整体算法模型，包括编码器、解码器，以及用于保持英文草稿与中文翻译一致的对齐模块。",
  },
  method: {
    enTitle: "Method",
    zhTitle: "方法介绍",
    en: "The method consists of three stages: section planning, bilingual generation, and interactive revision. Users can switch chapters from the sidebar and continue editing in place.",
    zh: "方法包含三个阶段：章节规划、双语生成与交互式修订。用户可通过左侧目录切换章节，并在当前编辑区继续修改。",
  },
  experiment: {
    enTitle: "Experiments",
    zhTitle: "实验结果",
    en: "We evaluate writing speed, translation consistency, and user preference. Results show that section-level switching reduces context loss compared with a single long document.",
    zh: "我们评估了写作速度、翻译一致性与用户偏好。结果表明，按章节切换相比单篇长文更能减少上下文丢失。",
  },
  discussion: {
    enTitle: "Discussion and Conclusion",
    zhTitle: "讨论和总结",
    en: "The interface demonstrates that a chapter sidebar can behave like a tab switcher: the active item is highlighted, and the corresponding bilingual content is displayed immediately.",
    zh: "该界面说明章节侧栏可以像标签切换一样工作：当前项高亮，同时立刻展示对应的中英双语内容。",
  },
  references: {
    enTitle: "References",
    zhTitle: "引用文献",
    en: "[1] Author. Title of the referenced paper. Conference or Journal, Year.\n[2] Author. Another related work on bilingual academic writing tools. Year.",
    zh: "[1] 作者. 被引论文标题. 会议或期刊, 年份.\n[2] 作者. 另一篇关于双语学术写作工具的相关工作. 年份.",
  },
};