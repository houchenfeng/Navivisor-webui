export type TopicStep = 1 | 2 | 3 | 4 | 5;

export type TopicContentStatus = '真实' | '教学模拟' | '待核验' | '需复核';

export type KeywordGroup = {
  label: string;
  description: string;
  items: string[];
};

export type TopicDraft = {
  interest: string;
  boundary: string;
  keywords: KeywordGroup[];
  searchFeedback: Record<string, '相关' | '部分相关' | '不相关'>;
  confirmedTopic?: string;
};
