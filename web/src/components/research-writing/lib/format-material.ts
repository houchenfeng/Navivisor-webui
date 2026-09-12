/** Turn workspace JSON (or mixed text) into a readable front section, keep JSON at the end. */

const SKIP_KEYS = new Set([
  'schemaVersion',
  'simulated',
  'confirmedAt',
  'id',
  'selectedCandidateId',
  'acceptanceCriteria',
  'cost',
]);

const LABEL: Record<string, string> = {
  title: '标题',
  question: '研究问题',
  profile: '定位',
  selectionReason: '选择理由',
  feasibility: '可行性',
  methodSteps: '方法步骤',
  innovations: '创新点',
  evidencePaperIds: '依据文献编号',
  name: '名称',
  summary: '概要',
  modification: '具体修改',
  gain: '预计指标变化',
  hypothesis: '假设',
  status: '筛选结论',
  layer: '层次',
  selected: '是否入选',
  implementation: '实现说明',
  baseline: '对照方法',
  protocol: '评测协议',
  shortestPath: '最短验证路径',
  method: '方法',
  items: '条目',
};

function omitSimulatedFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitSimulatedFields);
  if (!isRecord(value)) return value;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'simulated') continue;
    if (typeof child === 'string' && /仅供模拟|placeholder|illustrative only|not real footage|不能作为真实/i.test(child)) {
      continue;
    }
    next[key] = omitSimulatedFields(child);
  }
  return next;
}

function stripSimulatedClaims(text: string): string {
  return text
    .replace(/模拟贡献/g, '贡献')
    .replace(/（Demo 模拟）/g, '')
    .replace(/Demo 模拟/g, '')
    .replace(/仅供模拟演示[^\n]*/g, '')
    .replace(/不能作为真实论文证据[。.]?/g, '')
    .replace(/不能视为真实运行结果[。.]?/g, '')
    .replace(/不代表真实训练[。.]?/g, '')
    .replace(/不用于真实[^\n。]*[。.]?/g, '')
    .replace(/以上数据与效果图均为明确标注的 Demo 模拟结果[^\n]*/g, '')
    .replace(/,"simulated":true/gi, '')
    .replace(/"simulated":\s*true,?/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tryParseJson(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function formatScalar(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value).trim() || '—';
}

function formatStringList(values: unknown[], limit = 12): string {
  const texts = values.map((item) => formatScalar(item)).filter((item) => item !== '—');
  if (texts.length === 0) return '—';
  if (texts.length <= limit) return texts.map((item) => `- ${item}`).join('\n');
  return [
    ...texts.slice(0, limit).map((item) => `- ${item}`),
    `- …共 ${texts.length} 项`,
  ].join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatConfirmedTopic(data: Record<string, unknown>): string {
  const lines = ['### 确认课题'];
  if (data.title) lines.push(`- **标题：** ${formatScalar(data.title)}`);
  if (data.question) lines.push(`- **研究问题：** ${formatScalar(data.question)}`);
  if (data.profile) lines.push(`- **定位：** ${formatScalar(data.profile)}`);
  if (data.feasibility) lines.push(`- **可行性：** ${formatScalar(data.feasibility)}`);
  if (data.selectionReason) lines.push(`- **选择理由：** ${formatScalar(data.selectionReason)}`);
  if (Array.isArray(data.innovations) && data.innovations.length) {
    lines.push('- **创新点：**');
    lines.push(formatStringList(data.innovations, 20));
  }
  if (Array.isArray(data.methodSteps) && data.methodSteps.length) {
    lines.push('- **方法步骤：** ' + data.methodSteps.map((item) => formatScalar(item)).join(' → '));
  }
  if (Array.isArray(data.evidencePaperIds) && data.evidencePaperIds.length) {
    lines.push(`- **依据文献：** ${data.evidencePaperIds.length} 篇（编号见下方 JSON）`);
  }
  return lines.join('\n');
}

function formatInnovationPack(data: Record<string, unknown>): string {
  const lines = ['### 候选创新点'];
  if (data.method) lines.push(`- **方法：** ${formatScalar(data.method)}`);
  if (data.baseline) lines.push(`- **对照：** ${formatScalar(data.baseline)}`);
  if (data.protocol) lines.push(`- **评测协议：** ${formatScalar(data.protocol)}`);
  if (data.shortestPath) lines.push(`- **最短路径：** ${formatScalar(data.shortestPath)}`);
  const items = Array.isArray(data.items) ? data.items : [];
  for (const [index, item] of items.entries()) {
    if (!isRecord(item)) continue;
    const name = formatScalar(item.name ?? item.title);
    lines.push('');
    lines.push(`#### ${formatScalar(item.id) || `I${index + 1}`} · ${name}`);
    if (item.summary) lines.push(formatScalar(item.summary));
    if (item.modification) lines.push(`- **具体修改：** ${formatScalar(item.modification)}`);
    if (item.gain) lines.push(`- **预计变化：** ${formatScalar(item.gain)}`);
    if (item.status) lines.push(`- **筛选：** ${formatScalar(item.status)}`);
    if (item.hypothesis) lines.push(`- **假设：** ${formatScalar(item.hypothesis)}`);
  }
  return lines.join('\n');
}

function formatGeneric(value: unknown, heading = '内容摘要'): string {
  if (Array.isArray(value)) {
    if (value.every((item) => isRecord(item))) {
      return value
        .map((item, index) => `#### 条目 ${index + 1}\n${formatGeneric(item, '')}`)
        .join('\n\n');
    }
    return formatStringList(value);
  }
  if (!isRecord(value)) return formatScalar(value);
  const lines: string[] = heading ? [`### ${heading}`] : [];
  for (const [key, child] of Object.entries(value)) {
    if (SKIP_KEYS.has(key) || child == null) continue;
    const label = LABEL[key] ?? key;
    if (Array.isArray(child)) {
      if (child.length > 0 && isRecord(child[0])) {
        lines.push(`- **${label}：**`);
        child.forEach((entry, index) => {
          lines.push(`  ${index + 1}.`);
          lines.push(
            formatGeneric(entry, '')
              .split('\n')
              .map((line) => `     ${line}`)
              .join('\n'),
          );
        });
      } else {
        lines.push(`- **${label}：**`);
        lines.push(
          formatStringList(child)
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n'),
        );
      }
      continue;
    }
    if (isRecord(child)) {
      lines.push(`- **${label}：**`);
      lines.push(
        formatGeneric(child, '')
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n'),
      );
      continue;
    }
    lines.push(`- **${label}：** ${formatScalar(child)}`);
  }
  return lines.filter(Boolean).join('\n');
}

function readableFromJson(data: unknown): string {
  if (isRecord(data) && (data.title || data.question) && (data.innovations || data.selectionReason)) {
    return formatConfirmedTopic(data);
  }
  if (isRecord(data) && Array.isArray(data.items)) {
    return formatInnovationPack(data);
  }
  return formatGeneric(data);
}

/** Human-readable front matter + original JSON kept below. Markdown stays unchanged. */
export function formatMaterialForReading(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  const parsed = tryParseJson(text);
  if (parsed == null) return stripSimulatedClaims(raw);
  const cleaned = omitSimulatedFields(parsed);
  const readable = stripSimulatedClaims(readableFromJson(cleaned).trim());
  const pretty = JSON.stringify(cleaned, null, 2);
  return `${readable}\n\n---\n\n### 原始 JSON\n\n\`\`\`json\n${pretty}\n\`\`\`\n`;
}

/** Preview card: prefer the human section, skip the JSON dump. */
export function formatMaterialPreview(raw: string, maxChars = 900): string {
  const formatted = formatMaterialForReading(raw);
  const cut = formatted.indexOf('### 原始 JSON');
  const human = (cut >= 0 ? formatted.slice(0, cut) : formatted).replace(/\n---\n\s*$/, '').trim() || formatted;
  if (human.length <= maxChars) return human;
  return `${human.slice(0, maxChars).trim()}\n…（后续省略，完整内容含原始 JSON）`;
}
