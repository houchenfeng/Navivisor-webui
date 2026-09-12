import { initialWritingData, type WritingData } from "@/components/research-writing/data/writingSteps";
import { DEMO_COMPARISON_HEADERS } from "@/components/research-experiment/demo-artifacts";

const STORAGE_KEY_PREFIX = "writing-app:data:v2";

function storageKey(projectId?: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${projectId?.trim() || "unbound"}`;
}

/**
 * 从 localStorage 读取保存的数据。
 * 读取失败或数据损坏时，返回初始数据。
 */
export function loadData(projectId?: string | null): WritingData {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return initialWritingData;

    const parsed = JSON.parse(raw) as Partial<WritingData>;
    const looksLikeSamDefault =
      JSON.stringify(parsed.experimentTable?.headers) === JSON.stringify([...DEMO_COMPARISON_HEADERS]) ||
      JSON.stringify(parsed.experimentTable?.headers) === JSON.stringify(["Method", "Dataset", "Accuracy", "F1"]);
    const tables =
      Array.isArray(parsed.experimentTables) && parsed.experimentTables.length > 0
        ? parsed.experimentTables
        : parsed.experimentTable?.headers?.length && !looksLikeSamDefault
          ? [
              {
                title: parsed.experimentTable.title || '结果表格',
                headers: parsed.experimentTable.headers,
                rows: parsed.experimentTable.rows,
              },
            ]
          : [];
    return {
      ...initialWritingData,
      ...parsed,
      experimentTables: tables,
      experimentTable: tables[0] ?? initialWritingData.experimentTable,
    };
  } catch (e) {
    console.warn("[storage] 读取失败，使用初始数据", e);
    return initialWritingData;
  }
}

/**
 * 保存数据到 localStorage。
 */
export function saveData(data: WritingData, projectId?: string | null): void {
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(data));
  } catch (e) {
    console.warn("[storage] 保存失败（可能超出配额）", e);
  }
}

/**
 * 清空已保存的数据。
 */
export function clearData(projectId?: string | null): void {
  try {
    localStorage.removeItem(storageKey(projectId));
  } catch (e) {
    console.warn("[storage] 清空失败", e);
  }
}
