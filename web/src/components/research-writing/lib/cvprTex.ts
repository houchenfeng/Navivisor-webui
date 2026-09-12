import type { WritingData } from "@/components/research-writing/data/writingSteps";

/** 把常见的 Unicode 符号转成 LaTeX 命令 */
function replaceUnicodeSymbols(s: string): string {
  return s
    .replace(/</g, "$<$")
    .replace(/>/g, "$>$")
    .replace(/≥/g, "$\\geq$")
    .replace(/≤/g, "$\\leq$")
    .replace(/≠/g, "$\\neq$")
    .replace(/≈/g, "$\\approx$")
    .replace(/×/g, "$\\times$")
    .replace(/÷/g, "$\\div$")
    .replace(/±/g, "$\\pm$")
    .replace(/−/g, "-")
    .replace(/–/g, "--")
    .replace(/—/g, "---")
    .replace(/’/g, "'")
    .replace(/‘/g, "`")
    .replace(/“/g, "``")
    .replace(/”/g, "''")
    .replace(/…/g, "\\ldots{}")
    .replace(/•/g, "\\textbullet{}")
    .replace(/α/g, "$\\alpha$")
    .replace(/β/g, "$\\beta$")
    .replace(/γ/g, "$\\gamma$")
    .replace(/δ/g, "$\\delta$")
    .replace(/λ/g, "$\\lambda$")
    .replace(/μ/g, "$\\mu$")
    .replace(/π/g, "$\\pi$")
    .replace(/σ/g, "$\\sigma$")
    .replace(/τ/g, "$\\tau$")
    .replace(/φ/g, "$\\phi$")
    .replace(/θ/g, "$\\theta$")
    .replace(/Δ/g, "$\\Delta$")
    .replace(/Σ/g, "$\\Sigma$")
    .replace(/→/g, "$\\rightarrow$")
    .replace(/←/g, "$\\leftarrow$")
    .replace(/∈/g, "$\\in$")
    .replace(/∀/g, "$\\forall$")
    .replace(/∃/g, "$\\exists$");
}

/** 转义 LaTeX 特殊字符 */
function esc(s: string): string {
  // Escape user text first so generated LaTeX commands remain valid.
  return s
    .replace(/\\/g, "\\\\")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function latexText(s: string): string {
  return replaceUnicodeSymbols(esc(s));
}

/** 把多段文字拆成 LaTeX 段落（空行分段） */
function paragraphs(s: string): string {
  return s
    .split(/\n\s*\n/)
    .map((p) => latexText(p.trim()))
    .filter(Boolean)
    .join("\n\n");
}

/** 生成实验结果的 LaTeX 表格 */
function buildTables(data: WritingData): string {
  const tables =
    data.experimentTables?.length > 0
      ? data.experimentTables
      : data.experimentTable.headers.length > 0
        ? [{ title: data.experimentTable.title || "Results", ...data.experimentTable }]
        : [];
  return tables
    .map((table, index) => {
      if (table.headers.length === 0 || table.rows.length === 0) return "";
      const colSpec = "l".repeat(table.headers.length);
      const headerRow = table.headers.map((h) => `\\textbf{${latexText(h)}}`).join(" & ");
      const bodyRows = table.rows
        .map((r) => r.map((c) => latexText(c)).join(" & ") + " \\\\")
        .join("\n    ");
      return `
\\begin{table}[t]
  \\centering
  \\caption{${latexText(table.title || "Experimental results")}.}
  \\label{tab:results-${index + 1}}
  \\begin{tabular}{${colSpec}}
    \\toprule
    ${headerRow} \\\\
    \\midrule
    ${bodyRows}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
    })
    .join("\n");
}

function resultImagesOf(data: WritingData): string[] {
  if (data.resultImages?.length) return data.resultImages;
  return data.algorithmIllustImage ? [data.algorithmIllustImage] : [];
}

/** 生成 main.tex（CVPR 格式，无行号版本） */
export function buildCvprTex(data: WritingData): string {
  const title = latexText(data.title || "Untitled Paper");

  const flowFig = data.algorithmFlowImage.startsWith("data:")
    ? `\\includegraphics[width=\\linewidth]{figures/algorithm_flow.png}`
    : `% \\includegraphics[width=\\linewidth]{figures/algorithm_flow.png}`;

  const resultFigs = resultImagesOf(data)
    .map((image, index) =>
      image.startsWith("data:")
        ? `
\\begin{figure}[t]
  \\centering
  \\includegraphics[width=\\linewidth]{figures/result_${index + 1}.png}
  \\caption{Qualitative or quantitative result visualization.}
  \\label{fig:result-${index + 1}}
\\end{figure}
`
        : "",
    )
    .join("\n");

  return `% CVPR 2026 Paper Template
% Based on the CVPR Author Kit: https://github.com/cvpr-org/author-kit
% !TEX program = pdflatex

\\documentclass[10pt,twocolumn,letterpaper]{article}

\\usepackage[review]{cvpr}

\\input{preamble}

\\definecolor{cvprblue}{rgb}{0.21,0.49,0.74}
\\usepackage[pagebackref,breaklinks,colorlinks,allcolors=cvprblue]{hyperref}

\\def\\paperID{*****}
\\def\\confName{CVPR}
\\def\\confYear{2026}

\\title{${title}}

\\author{Anonymous CVPR submission\\\\
Paper ID \\paperID}

\\begin{document}
\\maketitle

\\begin{abstract}
${paragraphs(data.abstract)}
\\end{abstract}

\\section{Introduction}
${paragraphs(data.intro)}

\\section{Related Work}
${paragraphs(data.related)}

\\section{Method}
${paragraphs(data.algorithm)}

\\begin{figure}[t]
  \\centering
  ${flowFig}
  \\caption{Overview of the proposed framework.}
  \\label{fig:flow}
\\end{figure}

${resultFigs}

\\section{Experiments}
${paragraphs(data.experiment)}

${buildTables(data)}

\\section{Discussion and Conclusion}
${paragraphs(data.discussion)}

${data.bibContent.trim() || data.references.length ? "\\nocite{*}" : ""}

{
\\small
\\bibliographystyle{ieeenat_fullname}
\\bibliography{main}
}

\\end{document}
`;
}

/** 生成 main.bib */
export function buildCvprBib(data: WritingData): string {
  if (data.bibContent.trim()) return data.bibContent.trim() + "\\n";
  if (!data.references || data.references.length === 0) {
    return "% Empty bibliography. Add your references here.\n";
  }

  return data.references
    .map((ref, idx) => {
      const rawKey = ref.key.includes(":") ? ref.key.split(":").pop()! : ref.key;
      const safeKey = rawKey.replace(/[^a-zA-Z0-9_:-]/g, "_");

      const yearMatch = ref.text.match(/(19|20)\d{2}/);
      const year = yearMatch ? yearMatch[0] : "2024";

      const cleanText = ref.text.replace(/\s+/g, " ").trim();
      const title = cleanText.length > 200 ? cleanText.slice(0, 200) : cleanText;

      return `@article{${safeKey},
  author    = {Unknown},
  title     = {${title.replace(/[{}]/g, "")}},
  journal   = {arXiv preprint},
  year      = {${year}},
  note      = {Reference ${idx + 1}}
}`;
    })
    .join("\n\n");
}
