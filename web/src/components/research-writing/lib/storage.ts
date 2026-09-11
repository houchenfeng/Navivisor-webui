import { initialWritingData, type WritingData } from "@/components/research-writing/data/writingSteps";

const STORAGE_KEY = "writing-app:data:v1";

/**
 * 从 localStorage 读取保存的数据。
 * 读取失败或数据损坏时，返回初始数据。
 */
export function loadData(): WritingData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialWritingData;

    const parsed = JSON.parse(raw);
    // 合并默认值，防止旧版本缺字段
    return { ...initialWritingData, ...parsed };
  } catch (e) {
    console.warn("[storage] 读取失败，使用初始数据", e);
    return initialWritingData;
  }
}

/**
 * 保存数据到 localStorage。
 */
export function saveData(data: WritingData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[storage] 保存失败（可能超出配额）", e);
  }
}

/**
 * 清空已保存的数据。
 */
export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("[storage] 清空失败", e);
  }
}
