/** 统计字符串里的中文字符数 */
export function countChinese(text: string): number {
  const matches = text.match(/[\u4e00-\u9fa5]/g);
  return matches ? matches.length : 0;
}

/** 统计英文单词数（按空格分隔，提取字母组成的词） */
export function countEnglishWords(text: string): number {
  // 去掉中文字符，避免干扰
  const clean = text.replace(/[\u4e00-\u9fa5]/g, " ");
  const matches = clean.match(/[a-zA-Z][a-zA-Z'-]*/g);
  return matches ? matches.length : 0;
}

/** 统计混合文本的总"词数"（中文按字 + 英文按词） */
export function countTotalWords(text: string): number {
  return countChinese(text) + countEnglishWords(text);
}

export interface WordCountResult {
  chinese: number;
  english: number;
  total: number;
  chars: number;
}

/** 返回完整统计结果 */
export function countWords(text: string): WordCountResult {
  const chinese = countChinese(text);
  const english = countEnglishWords(text);
  return {
    chinese,
    english,
    total: chinese + english,
    chars: text.length,
  };
}

export interface RangeCheck {
  status: "low" | "ok" | "high";
  min: number;
  max: number;
}

/** 判断总词数是否在推荐范围内 */
export function checkRange(
  total: number,
  min: number,
  max: number
): RangeCheck {
  if (total < min) return { status: "low", min, max };
  if (total > max) return { status: "high", min, max };
  return { status: "ok", min, max };
}