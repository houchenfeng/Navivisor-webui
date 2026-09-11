import type { WritingData } from "@/data/writingSteps";

export type QwenSection =
  | "title-abstract"
  | "intro"
  | "related"
  | "algorithm"
  | "experiment"
  | "discussion";

// ============ 配置 ============
// 改成 false 后，会调用真实后端（等你有 API Key 时再改）
const USE_MOCK = false;

// ============ Mock 数据 ============
const MOCK: Record<QwenSection, (data: WritingData) => string> = {
  "title-abstract": (d) =>
    JSON.stringify({
      title: `A Novel Approach to ${d.topic || "Your Topic"}`,
      abstract:
        "This paper presents a novel method for the given research topic. " +
        "We first analyze the limitations of existing approaches, then propose " +
        "a unified framework that integrates multiple components to address the " +
        "identified challenges. Extensive experiments on standard benchmarks " +
        "demonstrate that our method outperforms state-of-the-art baselines by " +
        "a significant margin. Our contributions are threefold: (1) a new " +
        "formulation of the problem; (2) an efficient training strategy; and " +
        "(3) comprehensive empirical validation. (Mock 数据，接入 Qwen 后会替换成真实生成)",
    }),
  intro: (d) =>
    `Introduction\n\n` +
    `Research on "${d.topic || "this topic"}" has attracted increasing attention in recent years...\n\n` +
    `(Mock 数据，接入 Qwen 后会替换成真实生成)`,
  related: () =>
    `Related Work\n\nPrevious studies have explored various directions...\n\n` +
    `(Mock 数据，接入 Qwen 后会替换成真实生成)`,
  algorithm: (d) =>
    `Method\n\nWe propose a framework named X to solve "${d.topic || "the problem"}"...\n\n` +
    `(Mock 数据，接入 Qwen 后会替换成真实生成)`,
  experiment: () =>
    `Experiments\n\nWe evaluate our method on three public datasets...\n\n` +
    `(Mock 数据，接入 Qwen 后会替换成真实生成)`,
  discussion: () =>
    `Discussion and Conclusion\n\nIn this paper, we proposed...\n\n` +
    `(Mock 数据，接入 Qwen 后会替换成真实生成)`,
};

// ============ 对外接口 ============
export async function generateWithQwen(
  section: QwenSection,
  data: WritingData
): Promise<string> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800)); // 模拟网络延迟
    return MOCK[section](data);
  }

  // 真实调用：需要后端 server 在 localhost:3001 跑着
  const res = await fetch("http://localhost:3001/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, context: data }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`生成失败：${err}`);
  }
  const json = await res.json();
  return json.content as string;
}