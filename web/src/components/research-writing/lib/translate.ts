export type TranslateDirection = "zh2en" | "en2zh";

export async function translateText(
  text: string,
  direction: TranslateDirection
): Promise<string> {
  if (!text.trim()) {
    throw new Error("内容为空，无需翻译");
  }

  const res = await fetch("http://localhost:3001/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, direction }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`翻译失败：${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.translation as string;
}

/**
 * 批量翻译多段文本
 * @returns 与输入 fields 相同 key 的对象，值为翻译结果
 */
export async function translateAll(
  fields: Record<string, string>,
  direction: TranslateDirection
): Promise<Record<string, string>> {
  const res = await fetch("http://localhost:3001/api/translate-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, direction }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`批量翻译失败：${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.translations as Record<string, string>;
}