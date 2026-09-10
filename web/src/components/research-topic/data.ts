import type { KeywordGroup } from './types';

/** User-editable starter input. It is an example, not a research fact. */
export const demoInterest = '我想了解大学生为什么会坚持或放弃垃圾分类，希望研究能帮助校园改进投放引导。';

export const starterKeywordGroups: KeywordGroup[] = [
  { label: '研究对象', description: '你观察谁或什么', items: ['大学生', '校园垃圾分类'] },
  { label: '研究任务', description: '你想弄清什么', items: ['坚持与放弃行为', '影响因素'] },
  { label: '研究场景', description: '问题发生在哪里', items: ['大学校园', '日常投放'] },
];

export const topicSteps = [
  { number: 1, label: '兴趣与边界', short: '从模糊想法开始' },
  { number: 2, label: '策略与试搜', short: '先检查方向是否找对' },
  { number: 3, label: '证据与空白', short: '决定哪些证据值得保留' },
  { number: 4, label: '候选方向', short: '比较三种取舍' },
  { number: 5, label: '深化与确认', short: '修改并交接下一步' },
] as const;

export const emptyResearchMessage = '真实检索服务尚未接入，因此这里不会显示虚构的论文、研究空白或候选结论。';
