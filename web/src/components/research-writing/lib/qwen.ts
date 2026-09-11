import type { WritingData } from "@/components/research-writing/data/writingSteps";

export type QwenSection =
  | "title-abstract"
  | "intro"
  | "related"
  | "algorithm"
  | "experiment"
  | "discussion";

export async function generateWithQwen(
  section: QwenSection,
  data: WritingData
): Promise<string> {
  void section;
  void data;
  throw new Error(
    "写作生成尚未接入统一 Research Workflow/Codex，已阻止旧 localhost 模型接口调用"
  );
}
