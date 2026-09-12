export type OpenAlexQueryPlan = {
  tier: 'focused' | 'balanced' | 'broad';
  reason: string;
  includeTerms: string[];
  excludeTitleTerms: string[];
  oql: string;
};

export type OpenAlexQueryOptions = {
  translatedTerms?: string[];
};

const SEMANTIC_SEGMENTATION_TERMS = [
  'semantic segmentation',
  'semantic segmentations',
  'scene parsing',
  'pixel-wise semantic segmentation',
  'pixel-level semantic segmentation',
];

const SEMANTIC_SEGMENTATION_EXCLUSIONS = [
  'instance segmentation',
  'object detection',
  'image classification',
];

const VIDEO_ANOMALY_TERMS = {
  focused: ['video anomaly detection', 'video anomaly localization', 'abnormal event detection', 'surveillance video anomaly detection'],
  balanced: ['video anomaly detection', 'video abnormal event detection', 'abnormal event detection', 'surveillance video analysis', 'video anomaly localization', 'anomaly detection in surveillance videos'],
  broad: ['video anomaly detection', 'anomaly detection', 'abnormal event detection', 'video surveillance', 'surveillance video'],
};

const VIDEO_ANOMALY_EXCLUSIONS = {
  focused: ['medical image', 'industrial anomaly', 'network intrusion', 'audio anomaly', 'time series anomaly'],
  balanced: ['medical image', 'network intrusion', 'credit card fraud', 'audio anomaly'],
  broad: [],
};

export function buildOpenAlexQueryPlan(input: string, options?: OpenAlexQueryOptions): OpenAlexQueryPlan {
  return buildOpenAlexQueryPlans(input, options)[0];
}

export function buildOpenAlexQueryPlans(input: string, options: OpenAlexQueryOptions = {}): OpenAlexQueryPlan[] {
  const normalized = input.toLowerCase();
  const videoAnomaly = (normalized.includes('视频异常') || normalized.includes('video anomaly') || normalized.includes('abnormal event')) && (normalized.includes('视频') || normalized.includes('video') || normalized.includes('surveillance'));
  const semanticSegmentation = normalized.includes('语义分割') || normalized.includes('semantic segmentation') || normalized.includes('scene parsing');
  if (videoAnomaly) return [
    makePlan('focused', VIDEO_ANOMALY_TERMS.focused, VIDEO_ANOMALY_EXCLUSIONS.focused, '优先使用视频异常检测的正式命名并排除明显跨领域噪声。'),
    makePlan('balanced', VIDEO_ANOMALY_TERMS.balanced, VIDEO_ANOMALY_EXCLUSIONS.balanced, '精准层结果不足，补充视频异常事件与监控视频常见表达。'),
    makePlan('broad', VIDEO_ANOMALY_TERMS.broad, VIDEO_ANOMALY_EXCLUSIONS.broad, '前两层去重结果不足，使用保底主题词以避免完全无结果。'),
  ];
  if (semanticSegmentation) return [
    makePlan('focused', SEMANTIC_SEGMENTATION_TERMS, SEMANTIC_SEGMENTATION_EXCLUSIONS, '优先使用语义分割正式命名并排除相邻视觉任务。'),
    makePlan('balanced', [...SEMANTIC_SEGMENTATION_TERMS, 'pixel labeling', 'scene understanding'], ['instance segmentation', 'object detection'], '精准层结果不足，补充像素标注和场景理解表达。'),
    makePlan('broad', ['semantic segmentation', 'scene parsing', 'pixel labeling'], [], '前两层去重结果不足，使用保底主题词。'),
  ];
  const terms = [...new Set([...(options.translatedTerms ?? []), ...extractSearchTerms(input)])];
  return [
    makePlan('focused', terms, [], '使用输入中可识别的英文命名词或中文关键词转换结果。'),
    makePlan('balanced', [...terms, 'research method', 'empirical study'], [], '精准层结果不足，补充常见研究表达。'),
  ];
}

function makePlan(tier: OpenAlexQueryPlan['tier'], includeTerms: string[], excludeTitleTerms: string[], reason: string): OpenAlexQueryPlan {
  if (includeTerms.length === 0) throw new Error('NO_SEARCH_TERMS');
  const safeIncludeTerms = includeTerms;
  const include = safeIncludeTerms.map(quote).join(' or ');
  const exclude = excludeTitleTerms.length > 0 ? ` and title has (not (${excludeTitleTerms.map(quote).join(' or ')}))` : '';
  return { tier, reason, includeTerms: safeIncludeTerms, excludeTitleTerms, oql: `works where title/abstract has (${include})${exclude}` };
}

function extractSearchTerms(input: string): string[] {
  const phrases = input.match(/[A-Za-z][A-Za-z0-9]*(?:[ -][A-Za-z0-9]+){0,4}/g) ?? [];
  const english = [...new Set(phrases.map((value) => value.trim().toLowerCase()).filter((value) => value.length >= 3))];
  if (english.length > 0) return english.slice(0, 5);
  const chinese = input.match(/[\u3400-\u4dbf\u4e00-\u9fff]{2,}/g) ?? [];
  return [...new Set(chinese.map((value) => value.trim()).filter(Boolean))].slice(0, 5);
}

function quote(value: string): string {
  return `"${value.replaceAll('"', '')}"`;
}
