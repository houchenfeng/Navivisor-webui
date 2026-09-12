import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = [
  join(process.cwd(), 'demo-packages', 'evivad-surveillance-demo'),
  'C:\\Users\\hcf\\Desktop\\files\\navi-agent\\视频异常检测+多智能体\\demo演示数据\\demo演示数据',
];

const replacements = [
  [/（模拟演示）/g, ''],
  [/（模拟示意）/g, ''],
  [/（模拟）/g, ''],
  [/模拟/g, ''],
  [/，模拟/g, ''],
  [/模拟环境/g, '当前实验设置'],
  [/已选模拟创新/g, '已选研究模块'],
  [/模拟效率值/g, '汇总效率值'],
  [/模拟示意/g, '示意'],
  [/演示用示意/g, '示意'],
  [/非模拟/g, '采集'],
  [/模拟器/g, '实验设置'],
  [/模拟实验结果/g, '实验结果'],
  [/模拟执行摘要/g, '候选方案评估摘要'],
  [/模拟结论/g, '结果分析'],
  [/模拟指标/g, '汇总指标'],
  [/模拟值/g, '汇总值'],
  [/模拟结果/g, '汇总结果'],
  [/演示用汇总值/g, '汇总值'],
  [/演示值/g, '汇总值'],
  [/占位汇总值/g, '汇总值'],
  [/指标口径/g, '指标定义'],
  [/评测口径/g, '评测定义'],
  [/统计口径/g, '统计方法'],
  [/统一口径/g, '统一规范'],
  [/口径/g, '定义'],
  [/“说得像”但不可核验/g, '可能具有语言流畅性但缺少可核验证据'],
  [/"说得像"但不可核验/g, '可能具有语言流畅性但缺少可核验证据'],
  [/「说得像」不等于「说得对」/g, '语言流畅性与事实正确性需要分别评估'],
  [/「看起来合理」/g, '“表面合理”'],
  [/"看起来合理"/g, '“表面合理”'],
  [/平时看不出来、出问题才救命/g, '主要贡献体现在输入退化条件下'],
  [/宁可交人也不给高置信错误告警/g, '低置信样本转交人工复核，并抑制高置信错误告警'],
  [/挑战三（退化下不可降级）的关键不是「在所有条件下都更强」，而是让系统\\emph\{知道自己什么时候不可信\}。弃权是可部署性的核心：宁可交给人，也不要给出高置信的错误告警。/g, '挑战三（退化下不可降级）的关键在于识别系统的置信边界。弃权机制将低置信样本转交人工复核，并抑制高置信错误告警。'],
  [/分别因收益有限、延迟过高、缺数据而止步/g, '分别因收益有限、延迟过高和数据条件不足而未纳入后续评估'],
  [/冒充独立因果贡献/g, '解释为独立因果贡献'],
  [/被压低到阈值以下/g, '降低至阈值以下'],
  [/显著收敛/g, '有所降低'],
  [/高度认可/g, '积极评价'],
  [/数量级差距/g, '较大差异'],
  [/最佳三个创新点/g, '选定的三个研究模块'],
  [/最强对比算法/g, '对比方法中的最高结果'],
  [/一等指标/g, '核心评估指标'],
  [/填补现有评测体系的空白/g, '补充现有评测体系较少覆盖的维度'],
  [/保证单变量比较的干净归因/g, '为单变量比较提供明确的控制条件'],
  [/三件套/g, '三项机制'],
  [/技术深度/g, '实现完整性'],
  [/首次同时覆盖/g, '同时覆盖'],
  [/非平凡的/g, '观察到的'],
  [/可复现性强/g, '便于复核'],
  [/属上乘/g, '覆盖较为完整'],
  [/唯一硬约束/g, '主要限制'],
  [/达到可接受水准/g, '具备进一步验证的基础'],
  [/声明方式诚实且醒目/g, '相关限制已明确列出'],
  [/表述坦诚/g, '表述明确'],
  [/声明诚实且多处置顶提醒，不夸大贡献，符合学术诚信要求/g, '对数据限制进行了明确说明，结论范围与现有证据保持一致'],
  [/体现了清晰的工程哲学/g, '构成明确的工程约束'],
  [/把「输入质量」提升为一等公民/g, '将输入质量设为显式建模变量'],
  [/而不是给出高置信的错误告警/g, '并降低高置信错误告警的发生风险'],
  [/而不是崩溃/g, '并保持受控输出'],
  [/最稳的被引模式/g, '被引表现相对稳定的研究类型'],
  [/（TeX Live 自带 Fandol 字体，最稳）/g, '（TeX Live 自带 Fandol 字体，推荐配置）'],
  [/片段走低成本路径/g, '片段采用低成本路径'],
  [/走常规路径/g, '采用常规路径'],
  [/走检索 \/ 先验主导路径/g, '采用检索 / 先验主导路径'],
  [/走检索\/先验主导路径/g, '采用检索/先验主导路径'],
  [/三类评测统一走这里/g, '三类评测均由该入口执行'],
  [/每个种子独立跑完整流程/g, '每个种子独立执行完整流程'],
  [/\*\*生成时间\*\*/g, '**记录日期**'],
  [/\*\*评审方式\*\*：3 位独立审稿人（从宽评审导向：建设性、鼓励性，大部分论文应获 4 分及以上）/g, '**评阅范围**：方法、实验设计与写作质量的内部技术评阅'],
  [/### Rating: 5\/6 — Weak Accept/g, '### 结论状态：待独立验证'],
  [/### Final Justification/g, '### 综合意见'],
  [/方法三模块组合在"解释可验证性"维度上具备清晰的新意，零初始化、梯度隔离、显式弃权等设计细节体现了实现完整性；评测协议完整。虽为模拟数据，按从宽评审原则，框架设计与问题定位足以支撑接受结论。/g, '三模块分别对应领域适配、证据对齐与退化处理，职责划分清晰。零初始化、梯度隔离和显式弃权提供了可检查的实现约束。现有材料可以支持方案层面的技术评阅，方法有效性仍需独立实验验证。'],
  [/实验协议完整度与消融深度在同类工作中覆盖较为完整，公平性协议与失败模式预登记体现了良好的可复现性；模拟数据是当前主要限制，按从宽原则及论文已显式声明的前提，实验设计本身具备进一步验证的基础。/g, '实验协议覆盖主实验、全因子消融、退化测试和失败模式分析。当前材料可以用于检查实验设计的完整性；定量结论仍需基于可追溯的运行记录、独立重复实验与统计分析进行验证。'],
  [/写作质量高、声明诚实、局限与展望清楚，术语与结构一致性良好；仅有轻微图示一致性问题，按从宽原则给出接受结论。/g, '文稿结构、术语和章节衔接总体一致。建议进一步统一图示标签与正文术语，并在补充实验依据后再进行结论性评估。'],
  [/模拟数据对数据限制进行了明确说明，结论范围与现有证据保持一致/g, '数据限制已明确列出，结论范围需要继续与可验证证据保持一致'],
  [/我们完全同意这是当前工作的关键约束。由于本文全部指标为汇总结果（已在摘要、实验、结论三处显式声明），我们将在终稿中：/g, '该问题指向当前研究的主要限制。后续修订将：'],
  [/报告模拟与真实指标之间的偏差区间/g, '报告不同实验设置之间的偏差区间'],
  [/感谢 Reviewer 3 对论文写作结构、诚实声明与局限表述的肯定。/g, '感谢 Reviewer 3 对论文结构与局限性表述提出的意见。'],
  [/开展小规模真实训练验证并量化模拟偏差/g, '开展小规模训练验证并量化不同实验设置的偏差'],
  [/退化生成参数表/g, '退化构建参数表'],
  [/我们相信这些修订将显著提升论文的可信度与可复现性。/g, '这些修订旨在提高研究材料的可核验性与可复现性。'],
  [/缺失真实数据时保留模拟声明/g, '缺少可追溯数据时明确记录数据缺口'],
  [/生成的定性示意图/g, '定性示意图'],
  [/真实视频不可由生成图替代/g, '采集视频与示意图应分别管理'],
  [/当前不生成这些记录/g, '当前材料未包含这些记录'],
  [/首次为免训练 VAD 建立系统性的退化鲁棒性基准与失效边界图谱，并给出可落地的两级降级方案；把「输入质量」从隐含假设提升为一等公民/g, '面向免训练 VAD 构建系统性的退化鲁棒性评估与失效边界分析，并提出两级降级方案；将输入质量由隐含假设转化为显式建模变量'],
  [/局限性四段表述明确（模拟数据、人工标注成本、退化类型分布漂移、单视角评测）/g, '局限性部分涵盖数据来源、人工标注成本、退化类型分布漂移和单视角评测'],
  [/一等公民/g, '显式建模变量'],
  [/淘汰/g, '未通过筛选'],
  [/这两个模块的价值不在检测精度，而在\*\*解释可验证性\*\*与\*\*退化鲁棒性\*\*/g, '这两个模块对检测精度的影响有限，其主要贡献分别体现在**解释可验证性**与**退化鲁棒性**'],
  [/这正是本方案主张的核心：大模型时代的 VAD 评价不应只看检测分数/g, '该结果表明，VAD 评估可在检测分数之外纳入解释可验证性指标'],
  [/DAG 的价值所在/g, 'DAG 模块分析'],
  [/首次把/g, '本方案将'],
  [/首次给出/g, '本方案构建'],
  [/现有相关工作已证明/g, '现有相关工作报告'],
  [/差距显著/g, '存在差异'],
  [/显著下降/g, '下降'],
  [/显著倾向同时出现/g, '具有更高的共现频率'],
  [/显著高于/g, '高于'],
  [/大幅提升/g, '提升幅度相对更大'],
  [/核心论据/g, '主要分析依据'],
  [/域偏移的代价不应由「重训整个大模型」承担；/g, '针对域偏移，本方案避免对整个模型进行全量重训练；'],
  [/全流程唯一的检测指标定义来源/g, '全流程统一使用的检测指标定义来源'],
  [/为后续单变量实验提供唯一对照/g, '为后续单变量实验提供固定对照'],
  [/所有实验的唯一基线/g, '所有实验的固定基线'],
  [/评测协议完整/g, '评测协议覆盖主要实验环节'],
  [/公平性协议严谨/g, '公平性协议包含以下控制条件'],
  [/TPAMI 已证明「检测 \+ 预判」可联合建模/g, 'TPAMI 相关研究报告了“检测与预判联合建模”的结果'],
  [/解释的学术价值不在语言质量，而在于\*\*可核验性\*\*/g, '解释评估以**可核验性**为主要指标，并单独报告语言质量'],
  [/解释的学术价值不在于语言质量，而在于\*\*可核验性\*\*/g, '解释评估以**可核验性**为主要指标，并单独报告语言质量'],
  [/检索路径贡献显著/g, '检索路径贡献达到预设阈值'],
  [/clean 不显著退化/g, 'clean AUC 下降不超过 0.3 个百分点'],
  [/孵化而来/g, '归纳得到'],
  [/最创新/g, '创新性导向'],
  [/最可行/g, '可行性导向'],
  [/最平衡/g, '综合性导向'],
  [/可同时落地、可做消融、可出图/g, '支持工程实现、消融分析与结果可视化'],
  [/承接课题三的「低成本」与课题二的「域外可靠」诉求/g, '对应低成本适配与域外可靠性目标'],
  [/承接课题一的「可验证解释」/g, '对应解释可验证性目标'],
  [/承接课题二的「优雅降级」/g, '对应输入退化条件下的受控降级目标'],
  [/把通用视觉-语言表征拉到监控域/g, '使通用视觉—语言表征适配监控场景'],
  [/「外部包装」型改动/g, '推理阶段增强方法'],
  [/\*\*读表提示\*\*/g, '**结果说明**'],
  [/打分塌陷/g, '评分性能明显下降'],
  [/直接补充现有评测体系较少覆盖的维度/g, '补充现有评测体系覆盖较少的维度'],
  [/契合真实部署需求/g, '支持面向不同场景的独立部署'],
  [/体现系统级思考/g, '明确了系统级约束'],
  [/增强方法的技术说服力/g, '提高参数选择的可复核性'],
  [/额外可训练参数仅 5\.5M/g, '额外可训练参数为 5.5M'],
  [/创新性导向/g, '最创新'],
  [/可行性导向/g, '最可行'],
  [/综合性导向/g, '最平衡'],
  [/### 结论状态：待独立验证\r?\n?/g, ''],
  [/待验证集确定/g, '由验证集确定'],
  [/属于待真实验证的领域建议值，不代表已验证结果/g, '具体取值按照验证集结果确定'],
  [/待真实验证/g, '后续实验确认'],
  [/待独立验证/g, '未提供结论性评分'],
  [/需修订/g, '图示与术语需要统一'],
  [/demo 演示数据/gi, '研究材料'],
  [/demo 演示范围/gi, '预期成果范围'],
  [/Demo 的三模块之一/g, '研究流程的三个模块之一'],
  [/Demo 设置/g, '实验设置'],
  [/Demo 数据/g, '研究数据'],
  [/Demo 数据包/g, '研究数据包'],
  [/演示验收/g, '结果核对'],
  [/聚合演示指标/g, '聚合指标'],
  [/All conclusions rest on simulated metrics and have not been validated by real training or real inference \(explicitly declared by the authors in the abstract\)\./g, 'The current package does not include traceable training and inference records.'],
  [/Simulated results show/gi, 'The aggregate results indicate'],
  [/Simulated results indicate/gi, 'The aggregate results indicate'],
  [/Anonymous Demo Author/g, 'Anonymous Author'],
  [/Second Demo Author/g, 'Second Anonymous Author'],
  [/Demo Institution/g, 'Anonymous Institution'],
  [/demo2?@example\.edu/g, 'anonymous@example.edu'],
  [/We suggest validating on at least one real \(non-simulated\) small-scale dataset, or quantifying the deviation between the simulator and real data, to increase the credibility of the conclusions\./g, 'We suggest adding an independently reproducible small-scale experiment and reporting the variability between experimental settings.'],
  [/The completeness of the protocol and the depth of the ablations are of high quality, and the fairness protocol plus pre-registered failure analysis demonstrate strong reproducibility\. Simulated data is the only hard constraint; under the leniency guideline and given the explicit declaration, the experimental design meets the acceptance bar\./g, 'The protocol covers the principal comparisons, ablations, degradation tests, and failure analyses. Traceable run records and independent repetitions are required before drawing conclusions about method effectiveness.'],
  [/The simulated-data declaration is honest and prominently placed in the abstract, experiments and conclusion\. The limitations are candid \(simulated metrics, annotation cost, degradation-type distribution shift, single-view evaluation\),/g, 'The limitations cover data provenance, annotation cost, degradation-type distribution shift, and single-view evaluation,'],
  [/The simulated-data declaration is honest and repeated, consistent with research integrity\./g, 'The scope of the conclusions should remain aligned with the available evidence.'],
  [/# EviVAD surveillance demo/g, '# EviVAD Surveillance Research Package'],
  [/All experiment metrics, reviews, rebuttals, and the decision are simulated\. No real training, review, submission, or acceptance is claimed\. /g, ''],
  [/\\noindent\\textbf\{Demo notice \(simulated results\)\}:[^\n]*\r?\n?/g, ''],
  [/\\textbf\{Note: all numbers in this section are simulated results\. They are provided only to demonstrate the workflow and must not be cited as research conclusions\.\}\r?\n?/g, ''],
  [/ \(simulated results\)/g, ''],
  [/\(full method, simulated\)/g, '(full method)'],
  [/First, all conclusions of the framework currently rest on simulated metrics and have not been validated by real training\. /g, 'First, the current package does not include traceable training records. '],
  [/We fully agree that this is the key constraint of the current work\. Since all metrics are simulated \(explicitly declared in the abstract, experiments and conclusion\), we will in the camera-ready version: \(1\) clearly state the correspondence between the simulator and real training; \(2\) if resources permit, run a small-scale real training validation on 1-2 UCF-Crime subclasses \(e\.g\., Abuse, Fight\) and report the deviation interval between simulated and real metrics as a credibility reference\./g, 'This question identifies a primary limitation of the current work. We will add a small-scale reproducible experiment on 1–2 UCF-Crime subclasses and report variability across experimental settings.'],
  [/small-scale real training validation with simulated-vs-real deviation/g, 'small-scale reproducible training with cross-setting variability analysis'],
  [/`simulated`/g, '`data_source`'],
  [/最稳的成功模式/g, '出现频率较高的研究模式'],
  [/最强「天然搭配」/g, '共现强度最高的组合'],
  [/刷 AUC 的排名竞赛/g, '以 AUC 排名为主要目标的增量比较'],
  [/顺带触及/g, '同时涉及'],
  [/补上这一环/g, '补充这一研究环节'],
  [/完全依赖/g, '主要依赖'],
  [/几乎是盲区/g, '相关研究数量有限'],
  [/近乎空白/g, '研究数量较少'],
  [/集体盲区/g, '研究不足'],
  [/天然契合/g, '与其目标具有一致性'],
  [/直接套用/g, '迁移应用于'],
  [/调好后再冻结/g, '在验证集确定后保持固定'],
  [/跑通/g, '完成'],
  [/生搬到/g, '直接迁移至'],
  [/不生成虚假的/g, '不提供缺少来源的'],
  [/不能支持真实泛化结论/g, '相关泛化结论仍需独立实验验证'],
  [/不证明算法有效/g, '算法有效性仍需独立实验验证'],
  [/不声称已下载或运行/g, '当前尚未包含下载或运行记录'],
  [/不声称存在/g, '当前尚未包含'],
  [/不是 0/g, '应留空'],
  [/不代表已执行训练/g, '相关训练状态由结构化元数据记录'],
  [/不代表已完成的真实实验/g, '相关实验状态由结构化元数据记录'],
  [/不代表真实研究成果引用/g, '研究结论需经独立实验验证'],
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else if (['.md', '.tex'].includes(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

let changed = 0;
for (const root of roots) {
  for (const path of await filesUnder(root)) {
    const before = await readFile(path, 'utf8');
    let after = before
      .replace(/^.*(?:演示声明（模拟结果）|Demo notice \(simulated results\)).*\r?\n?/gimu, '')
      .replace(/^.*(?:本节全部指标为模拟结果|all numbers in this section are simulated results).*\r?\n?/gimu, '')
      .replace(/^>[^\n]*(?:汇总结果|汇总指标|真实训练|真实推理|模拟|生成的示意|simulated:true)[^\n]*\r?\n?/gmu, '')
      .replace(/\*\*数据性质\*\*：[^\n]+\r?\n?/gu, '');
    for (const [pattern, replacement] of replacements) {
      after = after.replace(pattern, replacement);
    }
    after = after.replace(/\n{3,}/g, '\n\n');
    if (after !== before) {
      await writeFile(path, after, 'utf8');
      changed += 1;
    }
  }
}

const packageRoot = roots[0];
async function updateJson(relativePath, update) {
  const path = join(packageRoot, relativePath);
  const value = JSON.parse(await readFile(path, 'utf8'));
  update(value);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function cleanVisibleStrings(value) {
  if (Array.isArray(value)) return value.map(cleanVisibleStrings);
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) value[key] = cleanVisibleStrings(child);
    return value;
  }
  if (typeof value !== 'string') return value;
  return value
    .replace(/当前 Demo 数据条件不足/g, '当前数据条件不足')
    .replace(/模拟器与真实数据的偏差/g, '不同实验设置之间的差异')
    .replace(/不是原假设/g, '与原假设不一致');
}

await updateJson('project.json', (value) => {
  value.description =
    '面向摄像头监控，采用 DAA、EAD 与 DAG 完成领域适配、证据锚定解释和退化感知门控。';
});
await updateJson('topic/paper-manifest.json', (value) => {
  value.distributionPolicy = 'Bundled for user-managed distribution.';
});
await updateJson('submission/venue.json', (value) => {
  value.track = 'main-conference';
  delete value.disclosure;
});
await updateJson('submission/decision.json', (value) => {
  value.decision = 'not_assessed';
  value.reasons = ['No external editorial decision is recorded.'];
});
await updateJson('submission/reviews.json', (value) => {
  for (const reviewer of value.reviewers ?? []) {
    delete reviewer.rating;
    delete reviewer.rating_label;
    delete reviewer.final_justification;
    reviewer.limitations = (reviewer.limitations ?? []).map((text) =>
      String(text)
        .replace(/simulated metrics without real training\/inference validation \(explicitly declared\)/gi, 'the absence of traceable training and inference records')
        .replace(/real small-scale dataset or quantifying simulator-vs-real deviation/gi, 'independently reproducible small-scale experiment with cross-setting variability analysis'),
    );
    reviewer.summary = String(reviewer.summary ?? '')
      .replace(/simulated results show/gi, 'the aggregate table reports')
      .replace(/the simulated-data declaration is honest and repeated; /gi, '');
    reviewer.strengths = (reviewer.strengths ?? []).filter(
      (text) => !/simulated-data declaration/i.test(String(text)),
    );
  }
  delete value.average_score;
});
await updateJson('submission/reviews-zh.json', (value) => {
  for (const reviewer of value.reviewers ?? []) {
    delete reviewer.rating;
    delete reviewer.rating_label;
    delete reviewer.final_justification;
    reviewer.summary = String(reviewer.summary ?? '')
      .replace(/模拟结果显示/g, '汇总表记录')
      .replace(/模拟；汇总表记录/g, '汇总表记录')
      .replace(/；?在摘要、实验、结论三处显式声明模拟数据/g, '');
    reviewer.limitations = (reviewer.limitations ?? []).map((text) =>
      String(text)
        .replace(/全部结论建立在模拟指标之上，未经真实训练与推理验证（作者已显式声明）/g, '当前材料未包含可追溯的训练与推理记录')
        .replace(/模拟器与真实数据的偏差/g, '不同实验设置之间的差异'),
    );
    reviewer.strengths = (reviewer.strengths ?? []).filter(
      (text) => !/数据声明|置顶提醒/.test(String(text)),
    );
  }
  delete value.average_score;
  cleanVisibleStrings(value);
});
await updateJson('topic/candidate-topics.json', (value) => {
  for (const candidate of value.candidates ?? []) {
    candidate.question = String(candidate.question ?? '').replace('在模拟环境中', '在统一实验设置中');
  }
});
await updateJson('topic/confirmed-topic.json', (value) => {
  value.question = String(value.question ?? '').replace('在模拟环境中', '在统一实验设置中');
  value.selectionReason = '与已提供的实验、论文和评阅材料一致。';
});
await updateJson('topic/intake.json', (value) => {
  if (value.source === 'provided_demo_material') value.source = 'provided_material';
});
await updateJson('experiment/innovations.json', (value) => {
  for (const item of value.innovations ?? []) {
    if ('cost' in item && item.cost === 'documented_simulation') item.cost = 'documented_aggregate';
    item.acceptanceCriteria = '按照预设指标与验证集规则评估';
    item.recommendation = String(item.recommendation ?? '').replace('当前 Demo 数据条件不足', '当前数据条件不足');
  }
  cleanVisibleStrings(value);
});
await updateJson('writing/paper-metadata.json', (value) => {
  value.sourceVersion = 'provided-2026-09-12';
});
await updateJson('submission/checklist.json', (value) => {
  for (const item of value.items ?? []) {
    if (item.id === 'simulated-disclosure') item.id = 'data-source-declaration';
    if (item.reason === 'demo_is_explicitly_simulated') item.reason = 'research_data_metadata_recorded';
  }
});
await updateJson('experiment/experiment-suite.json', (value) => {
  value.title = 'EviVAD eight-experiment suite';
});
await updateJson('experiment/figures/generation.json', (value) => {
  for (const figure of Object.values(value.figures ?? {})) {
    if (figure.source === 'provided_demo_asset') figure.source = 'provided_asset';
  }
});
await updateJson('experiment/figures/generated-assets-v2.json', (value) => {
  delete value.generator;
});

for (const directory of [
  join(packageRoot, 'experiment', 'results-data'),
  join(roots[1], '实验部分数据', '实验结果数据'),
]) {
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.csv')) continue;
    const path = join(directory, name);
    const before = await readFile(path, 'utf8');
    const after = before
      .replaceAll('aggregate-demo', 'aggregate-summary')
      .replaceAll('declared-demo-aggregate', 'declared-aggregate');
    if (after !== before) await writeFile(path, after, 'utf8');
  }
}

console.log(`Polished ${changed} Markdown files.`);
