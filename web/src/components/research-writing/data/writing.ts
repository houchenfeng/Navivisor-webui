export interface Chapter {
  id: string;
  zh: string;
  en: string;
}

export const chapters: Chapter[] = [
  { id: "intro",      zh: "引言",     en: "Introduction" },
  { id: "related",    zh: "相关工作", en: "Related Work" },
  { id: "method",     zh: "方法",     en: "Method" },
  { id: "experiment", zh: "实验",     en: "Experiments" },
  { id: "discussion", zh: "讨论",     en: "Discussion" },
  { id: "conclusion", zh: "结论",     en: "Conclusion" },
  { id: "references", zh: "参考文献", en: "References" },
];