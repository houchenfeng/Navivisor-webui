# 核心文献包：合法 OA PDF 与实验交接

本目录只处理用户已经确认候选题之后的 `core-literature` 阶段：筛选核心文献、生成 CSV/BibTeX、尝试合法开放获取（OA）PDF，并输出供实验模块只读消费的交接包。

它不生成候选题，不调用 Scopus，不绕过登录、订阅或版权限制，也不生成实验方案。

## 数量策略

- `selection.targetCount` 必须为 **100–300** 的整数，默认 `100`。
- 此目标是要交接的核心文献数量，不是保证获得同样数量的 PDF。
- 候选池不足时，保留实际数量并在 `manifest.json` 写明不足原因；不能用无关论文补齐。

## 运行产物

所有运行数据均位于仓库根目录相对路径：

```text
work/research-topic/runs/<coreLiteratureRunId>/core-literature/
  references.csv
  references.bib
  pdf/
  download-report.json
  download-state.json
  handoff.md
  manifest.json
```

运行数据、PDF、用户文献、fixture 和测试结果不应提交到 Git。

## 使用方式

调用方先提供已确认课题、带 OpenAlex ID/DOI/摘要/来源 URL 的候选文献，以及明确的筛选和 PDF 白名单配置。运行脚本：

```powershell
python research-tools/core-literature/core_pack.py --config input.json --mode plan --output-dir <run-directory>
python research-tools/core-literature/core_pack.py --config input.json --mode run --input-dir <normalized-input> --output-dir <run-directory> --download-oa
python research-tools/core-literature/validate_contract.py <run-directory>
```

只有显式 `--download-oa` 且 URL 域名在调用方白名单中时，脚本才会尝试下载。每个成功文件必须通过 HTTPS、HTTP、Content-Type、文件大小和 `%PDF-` 文件头校验；失败状态如 `not_open_access`、`http_error_403`、`invalid_pdf_content` 必须原样保留。

## 实验模块交接

实验模块只读消费 `handoff.md`、`references.csv`、`references.bib`、`download-report.json`、`manifest.json` 和其中状态为 `downloaded_oa` 或 `downloaded_existing` 的 PDF 相对路径。文件存在或下载成功不代表已阅读全文、已验证实验设置或已证明创新性。
