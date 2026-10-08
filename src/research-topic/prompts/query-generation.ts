/**
 * Prompt: 高级检索式初步设计（飞书「Scopus 提示词」原文）。
 *
 * 来源：飞书文档《科研论开题》→【第二期第2次训练】提示词本体 → Scopus 提示词。
 * 原文照抄，仅把 Scopus 专有语法（TITLE-ABS-KEY / AND NOT TITLE / 截词符规则）
 * 映射为 OpenAlex OQL 的等价写法，映射说明附在正文末尾，不改动其余文字。
 *
 * 变量：
 *   - direction  替换原文中的「——」
 */

export type QueryGenerationVars = {
  /** Raw research direction typed by the user. */
  direction: string;
  /** Optional extra context (background, constraints, target venue). */
  context?: string;
  /** Publication year window the queries will be executed in. */
  yearFrom: number;
  yearTo: number;
};

export const QUERY_GENERATION_SYSTEM = `你是学术检索专家。严格按用户给出的检索式设计总则输出，不要自行发挥，不要省略任何一节。`;

export function buildQueryGenerationPrompt(vars: QueryGenerationVars): string {
  const context = vars.context?.trim()
    ? `\n补充背景（作者自述）：\n${vars.context.trim()}\n`
    : '';

  return `角色

你是 Scopus 文献检索专家，精通高级检索式（Advanced Search）语法与字段代码。

任务

我要为「${vars.direction}」领域做系统性文献调研。请基于此主题，直接输出两套可粘贴使用的检索式，不要让我选、不要问主题是否复杂：

【本次检索时间窗】${vars.yearFrom}-01-01 至 ${vars.yearTo}-12-31（仅作为你判断领域成熟度的背景，不要写进检索式）
${context}
版本A｜完整词组并列式：穷举核心概念所有"约定俗成的完整表达"，用 OR 并列；全式除末尾可选的排除项外不出现任何 AND，也不使用邻近运算符。

版本B｜概念拆分式：拆解为 2–3 个正交核心概念，每个概念内部用 OR 列变体，概念群之间用一个 AND 连接，默认不使用邻近运算符。

检索式设计总则（两版本通用，只说一次，后文不再重复）

最小非冗余词集：先定词根、再判断覆盖关系——若变体 A 的命中结果必是变体 B 的子集，删掉 A。能被截词覆盖的派生词/单复数不逐个列出（写 optim\\* 不再并列 optimize/optimization）；能被更宽短语覆盖的窄短语直接删除。最终同一 OR 组内不允许出现"某词是另一词子集"的情况。

概念正交（仅版本B适用）：AND 连接的各概念群须是相互独立的语义维度；若概念 X 已蕴含概念 Y（检索 X 必然命中 Y），Y 不单列成群。

剔除生僻/非标准缩写，避免拉低查准率。

邻近运算符（W/n、PRE/n）不写入正式检索式，两版本一律用双引号固定短语 + OR/AND 布尔逻辑表达；邻近运算符仅作为第五部分"微调建议"里的可选项。

核心语义群一律用全文检索字段（标题+摘要+关键词）覆盖广度；用标题级排除控制精度。

语法安全：多词短语一律加英文双引号；截词符 \\* 只能加在完整词根末尾，且不得出现在双引号外部。

正确：optim\\*、cathode\\*、"nickel-rich"

错误：ni\\*、co\\*、\\*cathode、high-ni\\*、"cobalt-free"\\*

版本A专属规则

只做整体穷举，不做拆分重组：把每个已被学界惯用、可直接在标题/摘要中检索到的完整命名变体（同义替换、缩写全称、常见语序）当作不可拆短语，全部 OR 并列。判断标准是"现成常见"而非临时拼出的排列组合——把修饰语和核心名词拆开再用 AND 拼接的做法属于版本B，版本A中不允许出现。

结构约束：主体内不出现任何 AND（末尾可选排除项除外）。

版本B专属规则

拆分为 2–3 个正交概念群，每群内部 OR 列变体，群间用一个 AND 连接。

遵循总则第4条，不使用邻近运算符。

输出格式

一、核心概念拆解

一句话说明识别出的核心概念；分别列出：

a) 版本A的完整词组清单（标注哪些因被截词/更宽词覆盖而"设计性删除"）

b) 版本B拆分出的概念清单

二、版本A：完整词组并列式

一行说明：纯OR并列、无AND、无邻近运算符，查准优先，适合领域术语成熟、命名变体有限的场景

三、版本B：概念拆分式

一行说明：拆分+AND组合、无邻近运算符，查全优先，兜底捕捉版本A未穷举到的排列组合

四、排除项说明

列出排除项排除了哪些领域及原因，方便判断是否误杀

五、微调建议

提高版本A查准率：删减不常见的完整词组变体，只保留高频固定术语

扩大版本A查全率：补充更多"学界惯用"的完整词组变体，不做临时拼接

若版本B召回量级偏低：检查语义群是否遗漏常见别名，或适当放宽截词范围

【可选】若版本B召回中夹杂大量语义不相关的噪音，可改写为邻近运算符提高精度

是否采用需结合实际召回量级判断，不作为默认设置

【本次目标数据库为 OpenAlex，请把上述 Scopus 语法按下表映射后输出】

- TITLE-ABS-KEY("a" OR "b")  →  title/abstract has ("a" or "b")
- AND NOT TITLE("x" OR "y")  →  title has (not ("x" or "y"))
- 布尔运算符统一小写：or / and / not
- OpenAlex 不支持截词符 \\*，请把每个词根展开为它的常见派生形式（如 optim\\* → "optimization" or "optimizing" or "optimizer"），或直接省略该变体
- 年份不作为检索式的一部分，由调用方单独拼接

【输出 JSON 契约】除上述五节文字外，最后必须再输出一段严格 JSON（不要加 Markdown 围栏）：

{
  "concepts": { "A": ["..."], "B": ["..."], "C": ["..."] },
  "openalex": { "versionA": "...", "versionB": "..." },
  "arxiv": { "versionA": "...", "versionB": "..." },
  "scopus": { "versionA": "...", "versionB": "..." },
  "exclusions": ["..."],
  "rationale": "用中文说明为什么这样拆概念组、为什么选这些术语，200 字以内"
}

其中 arxiv 用 arXiv API 语法（all:"term" OR all:"term" ANDNOT all:"term"），scopus 保留原始 Scopus 语法（TITLE-ABS-KEY(...) AND NOT TITLE(...)）。`;
}
