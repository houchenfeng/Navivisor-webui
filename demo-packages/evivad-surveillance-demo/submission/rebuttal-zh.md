# 作者回复 — EviVAD

感谢三位审稿人。5 / 4 / 5 分肯定了问题切分（可验证解释 + 可降级），并指向同一批缺口：**具名最近邻方法、隔离实验、更紧的写作**。下文逐条回应。终稿与附录的分工见 R3-Q4。不追分：R2 若干条我们承认为当前局限。

**冻结的 protocol card（所有新数字共用）。** UCF-Crime 官方划分；帧级 AUC/AP；32 帧 / 8 fps；224×224；除非点名否则冻结 CLIP ViT-B/16；阈值只在验证集拟合；种子 {42, 3407, 2026}；均值±标准差。跑不了该卡的结果进入灰色「文献报告、不可比」区。

---

## Reviewer 1（弱接收 5）— 创新、PEFT、引用

同意 EviVAD 是**组合**。我们捍卫的不是「新 VLM」，而是：在冻结 CLIP 上，现有拼接**不能同时满足**的三个约束——(i) 起点与 B0 逐比特相同的领域 PEFT；(ii) 带删除检验的可证伪证据槽；(iii) VLM 离分布时的显式弃权 / 检索–先验路径。

### W1. 是否只是 LoRA+RAG+置信度

**不可拼接的一句。** 「B0+LoRA+RAG+标量置信阈值」可以提高 AUC、可以检索额外文本，但**不能**实现 EAR 删除检验（被引用的区间/线索必须对断言必要），也不能实现 DAG 的**分类型**失败（检索缺失 / 低质量 / 低置信弃权）。RAG4VAD 用文档条件化生成，并不把每句绑到可被反事实 clip 证伪的 `(t_s,t_e,cue)`。置信阈值不会切到先验路径，也不会标记 retrieval-miss。

**必须显著的消融格。** 完整 EviVAD vs（DAA+RAG 文本、无槽）vs（DAA+EAD、无 DAG）vs（B0+最大概率弃权、无 DAG）。现有 8 格已隔离 DAA→AUC、EAD→EAR/HR、DAG→退化网格；新行专门打 Reviewer 1 的稻草人。

**弱协同机制。** 终稿补：(a) 是否阻断 `L_EA` 进入视觉塔；(b) 干净 vs 强度-3 上 DAG 权重直方图。假设：隔离避免 EAD 用 AUC 换 EAR；DAG 只在退化 clip 上挪权重，干净 AUC 近乎加性。

### W2. Table 1 具名算法

拆成 **A 块（本协议卡，我们跑或官方权重）** 与 **B 块（论文报告、不可比）**。A 块预定：B0；CLIP 末块全微调上界；具名 Zanella 免训练局部分（替换泛化行）；CLIP-TSA / VadCLIP；若特征网格允许则 RTFM/MGFN，否则进 B 块并写 mismatch；Khedher 规则提示 / RAG4VAD 式检索解释（无 DAA/DAG）作为 EAR/HR 基线。摘要改为 **「本协议卡下相对 B0 的 +5.3 AUC」**，不写 SOTA。若同卡 VadCLIP 超过 82.1，如实写。

### W3. 应补引用

谱系段 + 文献：Hu LoRA；Gao CLIP-Adapter；Zhou CoOp/CoCoOp；Oord InfoNCE；Geifman 选择性预测；Hendrycks ImageNet-C；RTFM；MGFN；Wu 开词汇 VAD；Zanella；Kim DT-VAD；Sun RAG4VAD；Pei DRVAD；Khedher；Du 因果基准；Mo 低光失败。2025–2026 综述放在该段**之后**。

### W4. 记号与格式

§3 只保留 DAA/EAD/DAG。`L_EA`：1 正 + *K*=7 负（时间平移、线索对换、跨视频）。宽表拆分；Fig.1–2 与 §3 对齐。

### Q1–Q4

创新一句见上。PEFT 四路对照（LoRA last-4 Q/V vs CLIP-Adapter vs BitFit vs 视觉 prompt vs 末块全微调上界）。EAD 训练槽来自自动提案，EAR 金标为人工、视频隔离、标注者不见模型槽，再加 IAA。SOTA 表每条 B 块一行写协议差异。

---

## Reviewer 2（边缘接收 4）— 必须存在的实验

把此评当作接收门槛。8 格消融、4×3 网格、三种子、失败模式**包内已有**；其余标 **CR** 或 **附录**。

| ID | 实验 | 位置 |
|---|---|---|
| E1 | r×α×注入深度热图 | 附录 |
| E2 | ≤5.5M PEFT 对照 | 正文小表 |
| E3 | EAR 手册 + κ/α（≥2 人，≥100 clip） | 附录 + 正文一句 |
| E4 | 记忆库 N 与 UCF→XD 检索缺失 | 附录 |
| E5 | ΔAUC/ΔEAR 的 bootstrap 95% CI 与 Wilcoxon | 表注 |
| E6 | 真实夜/雨子集 vs 合成网格 | 正文；若不能拍，用亮度分位夜景子集，并把网格改称压力测试 |
| E7 | ShanghaiTech / CUHK Avenue 同卡 | 附录；时间不够则保持局限 |
| E8 | 具名 GPU 上 batch=1 FPS | 效率表 |

### W3–W4 / Q1–Q5

打印 protocol card；摘要只报相对 B0。Table 1 后写清：DAA 是 AUC 项（+2.6）；EAD 是 EAR/HR 项（+26.9 / −16.6）；DAG 是网格项（62.5→71.3）。退化参数列表 + 与夜景子集直方图；措辞改为「受 ImageNet-C 启发的合成压力网格」。EAR：IoU≥0.5 且线索在词表才满分；对区间错线索部分分。记忆库=**训练集正常 clip only**，做泄漏审计。计算附录拆 vision / LoRA / EAD / DAG 毫秒。

保留局限：单视角；无雪/眩光/红外/PTZ；无相机图。

---

## Reviewer 3（弱接收 5）— 写作与格式

摘要/引言改为：冻结 CLIP ViT-B/16，可训练 5.5M，三模块意图正交。「大模型」只指冻结骨干。数字跟在 protocol card 后。

正文一张最近邻表（Zanella / Wu / VadCLIP / RAG4VAD / Khedher / Mo / EviVAD × 骨干、可训练、解释是否绑定、退化路径、是否弃权）。

CVPR：`[review]`、图注在图下、宽表不溢出、矢量图、缩写三列审计（Fig.1 | Fig.2 | §3）、正文引用公式号。

引言 C1–C3 对应三模块；实验小节标题重复编号；失败模式改 4 行表。

跨模态：只写 RGB+音频，不承诺热红外/深度。

**页数：** 正文 ≤8 页放 protocol card、最近邻表、A 块主表、压缩 8 格、take-home、FPS、局限。附录放热图、PEFT 扩展、12 配置损坏阵、IAA 手册、泄漏审计、Avenue/ShanghaiTech、算力。

---

## 结束语

除非 A 块支持，否则不在 UCF-Crime 上称 SOTA。我们主张的是：冻结 CLIP 系统能够（1）用与 B0 起点相同的 LoRA 做域适配，（2）让解释成为可删除证据检验，（3）在退化上有意降级并弃权。这正是三位审稿人描述的那篇论文；终稿将对准这篇，而不是现在过满的摘要。
