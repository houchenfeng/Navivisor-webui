// 后端 API 服务封装

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export interface ReviewerData {
  id: number;
  focus: string;
  rating: number;
  confidence: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  questions: string[];
  limitations: string;
  ethicalConcerns: string;
  finalJustification: string;
}

export interface ReviewResult {
  reviewers: ReviewerData[];
  averageScore: number;
  decision: string;
}

export interface FinalResult {
  reviewers: ReviewerData[];
  averageScore: number;
  decision: "Accepted" | "Rejected" | "Borderline";
  decisionType?: "Oral" | "Highlight" | "Poster";
  enhancedRebuttal?: string;
}

// 提交论文，生成审稿意见
export async function submitPaper(payload: {
  title: string;
  authors: string;
  tldr: string;
  abstract: string;
  keywords: string;
  pdfFile?: File | null;
}): Promise<ReviewResult> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("authors", payload.authors);
  formData.append("tldr", payload.tldr);
  formData.append("abstract", payload.abstract);
  formData.append("keywords", payload.keywords);
  if (payload.pdfFile) {
    formData.append("pdf", payload.pdfFile);
  }

  const response = await fetch(`${API_BASE_URL}/api/submit-paper`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// 提交 Rebuttal，生成最终结果
export async function submitRebuttal(payload: {
  rebuttalText: string;
  reviewers: ReviewerData[];
  paperInfo: {
    title: string;
    authors: string;
    abstract: string;
  };
}): Promise<FinalResult> {
  const response = await fetch(`${API_BASE_URL}/api/submit-rebuttal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// 检查后端是否可用
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// 从 PDF 提取论文信息（标题、作者、摘要、关键词）
export async function extractPaperInfo(pdfFile: File): Promise<{
  title: string;
  authors: string;
  abstract: string;
  keywords: string;
  tldr: string;
}> {
  const formData = new FormData();
  formData.append("pdf", pdfFile);

  const response = await fetch(`${API_BASE_URL}/api/extract-paper-info`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
