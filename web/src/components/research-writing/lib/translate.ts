export type TranslateDirection = "zh2en" | "en2zh";

export async function translateText(
  text: string,
  direction: TranslateDirection
): Promise<string> {
  void text;
  void direction;
  throw new Error("翻译尚未接入统一 Research Workflow/Codex，已阻止旧 localhost 接口调用");
}

/**
 * 批量翻译多段文本
 * @returns 与输入 fields 相同 key 的对象，值为翻译结果
 */
export async function translateAll(
  fields: Record<string, string>,
  direction: TranslateDirection
): Promise<Record<string, string>> {
  void fields;
  void direction;
  throw new Error("批量翻译尚未接入统一 Research Workflow/Codex，已阻止旧 localhost 接口调用");
}
