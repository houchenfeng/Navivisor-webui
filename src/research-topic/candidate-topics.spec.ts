import { describe, expect, it } from 'vitest';
import {
  buildCandidatePrompt,
  renderCandidateMarkdown,
} from './candidate-topics';
import type { ResearchTopicCandidate } from './research-topic.types';

describe('buildCandidatePrompt', () => {
  const base = {
    direction: '单图地理定位',
    csvPath: '/work/runs/abc/first-search/first-search-papers.csv',
  };

  it('includes the direction, the CSV path and the three labels', () => {
    const prompt = buildCandidatePrompt(base);
    expect(prompt).toContain('单图地理定位');
    expect(prompt).toContain('/work/runs/abc/first-search/first-search-papers.csv');
    expect(prompt).toContain('偏可行');
    expect(prompt).toContain('偏创新');
    expect(prompt).toContain('较平衡');
  });

  it('forbids fabricating papers and metrics', () => {
    const prompt = buildCandidatePrompt(base);
    expect(prompt).toContain('不得补写不存在的论文、作者、DOI、指标或实验结果');
    expect(prompt).toContain('待核验');
  });

  it('embeds the upstream analysis when provided', () => {
    const prompt = buildCandidatePrompt({
      ...base,
      gapsMarkdown: '## 过于拥挤的方向\n- A+B',
      landscapeMarkdown: '# 态势',
      venueTiersMarkdown: '- 第 1 梯队 · CVPR',
    });
    expect(prompt).toContain('【研究空白识别（已生成，优先据此选题）】');
    expect(prompt).toContain('A+B');
    expect(prompt).toContain('【研究态势分析（已生成）】');
    expect(prompt).toContain('【期刊分层（已生成）】');
  });

  it('omits the upstream sections entirely when they are missing', () => {
    const prompt = buildCandidatePrompt(base);
    expect(prompt).not.toContain('【研究空白识别');
    expect(prompt).not.toContain('【研究态势分析');
  });

  it('treats a whitespace-only section as missing', () => {
    const prompt = buildCandidatePrompt({ ...base, gapsMarkdown: '   \n  ' });
    expect(prompt).not.toContain('【研究空白识别');
  });

  it('states that the user supplied no context rather than leaving a gap', () => {
    expect(buildCandidatePrompt(base)).toContain('用户没有补充上下文。');
    expect(
      buildCandidatePrompt({ ...base, context: '目标会议是 CVPR' }),
    ).toContain('用户补充上下文：目标会议是 CVPR');
  });
});

describe('renderCandidateMarkdown', () => {
  const candidates: ResearchTopicCandidate[] = [
    {
      label: '偏可行',
      title: '在现有 baseline 上加一个轻量模块',
      oneSentenceDefinition: '一句话',
      researchDesign: '技术路线',
      expectedInnovation: '预期创新',
      rationale: '依据 RE-001',
    },
  ];

  it('renders every candidate field under a labelled heading', () => {
    const md = renderCandidateMarkdown(candidates, '单图地理定位');
    expect(md).toContain('# 候选课题 · 单图地理定位');
    expect(md).toContain('## 偏可行｜在现有 baseline 上加一个轻量模块');
    expect(md).toContain('**一句话定义**：一句话');
    expect(md).toContain('**研究设计**：技术路线');
    expect(md).toContain('**预期创新性**：预期创新');
    expect(md).toContain('**立论依据**：依据 RE-001');
  });

  it('handles an empty candidate list without throwing', () => {
    expect(renderCandidateMarkdown([], 'x')).toContain('# 候选课题 · x');
  });
});
