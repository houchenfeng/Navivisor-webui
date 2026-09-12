# 视频异常检测 × 大模型（摄像头视频数据）· 算法完整详细架构（EviVAD）

> **一致性声明**：本文档全部模块名（EviVAD / DAA / EAD / DAG）、Baseline 定义（B0）、数据集（UCF-Crime / XD-Violence / UBnormal / MSAD）、退化网格（4 类 × 3 级 = 12 配置）、指标（AUC / AP / mAP@0.5 / EAR / CFS / HR / TCR / RPR / ECE）与超参数，均以《视频异常检测×大模型_实验方案.md》为准，不作更改，也不引入该文档之外的模块或文献。
> 凡实验方案未固定取值的量（证据弃权阈值 $\theta_{ev}$、排序损失权重 $\lambda_{rank}$、证据投影维度 $d_c$、记忆库规模 $N$），本文一律标注为「**由验证集确定**」，具体取值按照验证集结果确定。

---

## 1. 问题定义

### 1.1 任务形式化定义

**输入**：摄像头视频流。按 **32 帧 / 片段、8 fps 采样** 切分为片段 $X$；每帧 resize 至 $224\times224$、按 ImageNet 统计量归一化。

$$X \in \mathbb{R}^{T \times 3 \times H \times W}, \quad T = 32,\ H = W = 224$$

**输出**：模型 $f_{\theta}$ 对每个片段输出四元组

$$\hat{y} = \big(S,\ I,\ E,\ (c,\ a)\big)$$

| 输出项 | 含义 | 形式 |
|---|---|---|
| $S$ | 帧级异常分数曲线 | $\mathbb{R}^{T}$，元素取值经归一化到 $[0,1]$ |
| $I$ | 异常时间区间集合 | $\{(t_s^{(i)}, t_e^{(i)})\}_{i=1}^{m}$ |
| $E$ | 证据引用集合 + 自然语言解释 | $\{(t_s^{(j)}, t_e^{(j)}, \text{cue}_j)\}_{j=1}^{n}$ 与一段 explanation 文本 |
| $(c, a)$ | 置信度与弃权标志 | $c \in [0,1]$，$a \in \{0,1\}$ |

**学习设定**：训练阶段仅使用片段级异常标签（UCF-Crime 官方标注），帧级标注只用于评测与消融报告；模型不引入新的监督来源。这与实验方案中「DAA 与打分头只用 UCF-Crime 训练集」的设定一致。

**优化目标**：在保持免训练范式（冻结大模型主干）低成本优势的前提下，同时提升三类互相独立的指标——检测精度（AUC / AP）、解释可验证性（EAR / CFS / HR / TCR）、退化鲁棒性（RPR / ECE）。

### 1.2 数学符号表

| 符号 | 含义 | 维度 / 取值 |
|---|---|---|
| $T$ | 片段帧数 | 32 |
| $H, W$ | 帧高、宽 | $224 \times 224$ |
| $X$ | 输入视频片段 | $[T, 3, H, W]$ |
| $x_t$ | 片段中第 $t$ 帧 | $[3, H, W]$ |
| $D$ | 视觉塔隐层维度（CLIP ViT-B/16） | 768 |
| $P$ | 每帧 patch token 数（$14\times14$，另加 1 个 CLS） | 197 |
| $F$ | 帧级视觉特征序列 | $[T, D]$ |
| $f_t$ | 第 $t$ 帧的视觉特征 | $[D]$ |
| $\bar{f}$ | 片段级视觉特征（时间池化后） | $[D]$ |
| $E_{txt}$ | 异常 / 正常文本 prompt 嵌入矩阵 | $[K, D]$ |
| $K$ | prompt 数量（异常类 + 正常类） | 由配置决定 |
| $s_{vl}$ | 视觉-文本对齐分（帧级记 $s_{vl}^{(t)}$） | $\mathbb{R}$ / $[T]$ |
| $M$ | 检索增强正常性记忆库 | $[N, D]$ |
| $N$ | 记忆库条目数 | **由验证集确定** |
| $\mathcal{N}$ | 片段检索命中的 top-K 邻居索引集 | $\lvert \mathcal{N} \rvert = 8$ |
| $s_{ret}$ | 检索证据分（帧级记 $s_{ret}^{(t)}$） | $\mathbb{R}$ / $[T]$ |
| $s_{prior}$ | 定义 / 规则先验分（帧级记 $s_{prior}^{(t)}$） | $\mathbb{R}$ / $[T]$ |
| $q$ | 输入质量分（Q-Net 输出） | $[0,1]$ |
| $g$ | DAG 门控权重 | $[0,1]$ |
| $\tau_g,\ T_g$ | 门控中心与温度（实验方案写作 $\tau,\ T$） | $\tau_g = 0.5$，$T_g = 0.15$ |
| $S$ | 融合后的帧级异常分数 | $[T]$ |
| $\hat{S}$ | 时间平滑后的帧级异常分数 | $[T]$ |
| $s$ | 片段级融合分数（用于弃权判定） | $\mathbb{R}$ |
| $\tau_s,\ \delta$ | 弃权中心与半宽 | $\tau_s = 0.5$，$\delta = 0.08$ |
| $c$ | 置信度 | $[0,1]$ |
| $a$ | 弃权标志 | $\{0, 1\}$ |
| $z_k$ | 第 $k$ 个证据槽位 $(t_s, t_e, \text{cue})$ | 三元组 |
| $Z$ | 证据槽位集合 | $\{z_k\}$ |
| $h_{exp}$ | 解释文本的池化表征 | $[d_c]$ |
| $h_{z_k}$ | 证据槽位的编码表征 | $[d_c]$ |
| $d_c$ | 证据投影维度 | **由验证集确定** |
| $\theta_{ev}$ | 证据弃权阈值 | **由验证集确定** |
| $W_0$ | 冻结的预训练线性层权重 | $[D, D]$ |
| $A, B$ | LoRA 下投影、上投影矩阵 | $[r, D]$、$[D, r]$ |
| $r,\ \alpha$ | LoRA 秩与缩放系数 | $r = 4$，$\alpha = 8$ |
| $\lambda_{EA}, \lambda_{gate}, \lambda_{reg}$ | 损失权重 | $0.3$、$0.2$、$0.1$ |
| $\lambda_{rank}$ | 排序损失权重 | **由验证集确定** |

---

## 2. 总体架构与数据流（含张量尺寸）

### 2.1 完整流程

**摄像头视频流 → 质量评估探针 Q-Net → 冻结 VLM 视觉编码器（+ DAA 低秩旁路）→ 检索增强正常性记忆 → DAG 门控 → 异常打分头 → EAD 证据锚定解码 → 四类输出**

```text
摄像头视频流
   │  切分：32 帧 / 片段，8 fps 采样，resize 224×224
   ▼
X [32, 3, 224, 224]
   ├──────────────► Q-Net ──────────────► q ∈ [0,1]
   │                                        │
   ▼                                        │
冻结 VLM 视觉编码器（CLIP ViT-B/16，全冻结）+ DAA（末 4 层 Q/V LoRA）
   │  patch tokens [32, 197, 768]
   ▼
帧级视觉特征 F [32, 768] ──时间池化──► 片段级特征 f̄ [768]
   │                                        │
   │                        ┌───────────────┴────────────────┐
   │                        ▼                                ▼
   │              文本塔（冻结）→ E_txt [K, 768]      检索增强正常性记忆 M [N, 768]
   │                        │                                │
   │                        ▼                                ▼
   │              对齐分 S_vl [32]              top-K=8 检索 → S_ret [32]
   │                        │                                │
   │                        └──────────┬─────────────────────┘
   │                                   ▼
   │                        DAG 门控 g = σ((τ_g − q) / T_g)
   │                                   ▼
   │        S = (1 − g)·S_vl + g·(0.7·S_ret + 0.3·S_prior)   ◄── S_prior [32]（定义/规则先验）
   │                                   ▼
   │                           时间平滑 → Ŝ [32]
   │                                   ▼
   │                      片段级分数 s 与置信度 c，弃权判定 a
   │                                   ▼
   │                    异常打分头 → 异常时间区间 I
   │                                   ▼
   └──────────────► EAD 证据锚定解码 → 证据引用 E + explanation 文本
                                       ▼
                        四类输出：S / I / E / (c, a)
```

### 2.2 逐环节张量尺寸表

| 环节 | 模块 | 输入张量 | 输出张量 | 说明 |
|---|---|---|---|---|
| 0 | 片段采样 | 视频流 | $[T,3,H,W] = [32,3,224,224]$ | 8 fps 均匀采样 |
| 1 | 退化注入（可选） | $[32,3,224,224]$ | $[32,3,224,224]$ | 仅评测阶段，4 类 × 3 级共 12 配置 |
| 2 | Q-Net | $[32,3,224,224]$ | $q \in \mathbb{R}$ | 3 层卷积 + GAP + 1 层全连接，约 0.2 M 参数 |
| 3 | 冻结视觉塔 + DAA | $[32,3,224,224]$ | $[32,197,768]$ | 逐帧前向；DAA 只改 Q/V 投影 |
| 4 | 帧特征提取 | $[32,197,768]$ | $F \in [32,768]$ | 取 CLS / 池化 token |
| 5 | 时间池化 | $[32,768]$ | $\bar{f} \in [768]$ | 均值池化，用于片段级检索与门控 |
| 6 | 文本塔（冻结） | prompt 文本 | $E_{txt} \in [K,768]$ | 异常 / 正常 prompt 嵌入 |
| 7 | 对齐打分 | $F,\ E_{txt}$ | $S_{vl} \in [32]$ | 逐帧余弦相似度对 $K$ 取均值 |
| 8 | 记忆检索 | $\bar{f},\ M$ | $\mathcal{N}$（$\lvert\mathcal{N}\rvert = 8$） | 片段级检索，保证证据一致 |
| 9 | 检索证据分 | $F,\ M,\ \mathcal{N}$ | $S_{ret} \in [32]$ | 逐帧与 top-8 邻居相似度均值 |
| 10 | 先验分 | $F$ | $S_{prior} \in [32]$ | 定义 / 规则先验匹配分 |
| 11 | DAG 门控 | $q$ | $g \in \mathbb{R}$ | 标量权重，片段级 |
| 12 | 分数融合 | $S_{vl}, S_{ret}, S_{prior}, g$ | $S \in [32]$ | 逐帧加权 |
| 13 | 时间平滑 | $S$ | $\hat{S} \in [32]$ | 滑动平均 / 中值滤波 |
| 14 | 片段级分数 | $\hat{S}$ | $s \in \mathbb{R}$，$c \in [0,1]$ | 均值池化 |
| 15 | 弃权判定 | $s$ | $a \in \{0,1\}$ | $\lvert s - \tau_s \rvert < \delta$ |
| 16 | 区间提取 | $\hat{S}$ | $I$（$m$ 个区间） | 阈值化 + 连通分量 |
| 17 | EAD 解码 | $F, Z, \bar f$ | $E$ 与 explanation | 冻结 LLM + 证据投影头 |

---

## 3. 三个创新模块的数学定义

### 3.1 DAA · 低秩领域适配（Domain Low-rank Adapter）

**定位**：在冻结的 VLM 视觉编码器中注入低秩旁路，用极少的可训练参数把通用视觉-语言表征适配到监控域（俯视角、低照度、低分辨率、小目标、人群密集）。

**注入位置**：CLIP ViT-B/16 视觉塔 **末端 4 个 Transformer Block** 的 `q_proj` 与 `v_proj`（即第 9–12 层）。文本塔、聚合模块、其余视觉层全部冻结。

**定义**：对冻结线性层 $h = W_0 x$，改造为

$$h = W_0 x + \frac{\alpha}{r}\, B\,(A x)$$

其中 $W_0 \in \mathbb{R}^{D \times D}$ 冻结；$A \in \mathbb{R}^{r \times D}$；$B \in \mathbb{R}^{D \times r}$；$x \in \mathbb{R}^{D}$。缩放系数 $\alpha / r$ 使不同秩下的有效学习率保持可比。

**初始化**：

- $A$：Kaiming 初始化；
- $B$：**零初始化**。因此训练开始时 $\frac{\alpha}{r} B A x = 0$，模型前向输出与 Baseline **逐比特一致**，为单变量比较提供明确的控制条件。

**超参数取值**：$r = 4$，$\alpha = 8$，$\text{dropout} = 0.05$；新增可训练参数 $4.7$ M（约为骨干的 0.9%）。

**工程含义**：一个部署场景对应一个 adapter 文件（约 18 MB），可热插拔——这同时服务于课题三的「低成本」与课题二的「跨域」诉求。

### 3.2 EAD · 证据锚定解码（Evidence-Anchored Decoding）

**定位**：把异常解释从「自然语言描述」改造成「带证据引用、可被反例推翻」的可核验输出。解释评估以**可核验性**为主要指标，并单独报告语言质量。

**（a）证据槽位构造**：候选区间由**粗分数曲线的局部极大**与**检索到的正常性记忆**共同生成，形成槽位集合

$$ Z = \{\, z_k = (t_s^{(k)},\ t_e^{(k)},\ \text{cue}_k) \,\} $$

其中 $t_s^{(k)} < t_e^{(k)}$ 为候选区间端点，$\text{cue}_k$ 为该区间的线索描述（如「倒地」「奔跑」等可从片段与检索邻居中提取的语义线索）。

**（b）结构化输出 schema**：解码被约束为固定结构，证据字段为必填：

```json
{
  "score": 0.83,
  "evidence": [
    {"t_start": 5.4, "t_end": 9.1, "cue": "行人倒地，姿态突变"}
  ],
  "explanation": "该片段在 5.4–9.1 s 出现行人倒地，伴随异常加速度，判定为异常。"
}
```

**（c）证据对齐损失（InfoNCE 形式）**：令 $h_{exp}$ 为解释 token 的池化表征，$h_{z_k}$ 为槽位 $z_k$ 的编码表征，$z^{*}$ 为真值证据槽位，温度 $\tau_c = 0.07$：

$$L_{EA} = -\log \frac{\exp\!\big(\mathrm{sim}(h_{exp},\, h_{z^{*}}) / \tau_c\big)}{\sum_{k} \exp\!\big(\mathrm{sim}(h_{exp},\, h_{z_k}) / \tau_c\big)}$$

其中 $\mathrm{sim}(\cdot,\cdot)$ 为余弦相似度。该损失只更新**证据对齐投影头**（2 层 MLP，约 0.6 M 参数），主干 LLM 全程冻结。

**（d）弃权判据（解释侧）**：当证据槽位的最大对齐分低于阈值时，拒绝生成实质解释：

$$\max_k \mathrm{sim}(h_{exp},\, h_{z_k}) < \theta_{ev} \;\Longrightarrow\; \text{explanation} \leftarrow \text{「证据不足，拒绝判定」}$$

$\theta_{ev}$ 为 **由验证集确定**，实验方案未固定其取值。

**（e）评测定义**：EAD 的收益由实验方案定义的四个指标度量——证据归因召回 $EAR = \lvert E_{pred} \cap E_{gt}\rvert / \lvert E_{gt}\rvert$、反事实可反证分 $CFS = 1 - \frac{1}{M}\sum_{m} \mathbb{1}[\hat y(x_m^{-}) = \text{异常}]$、幻觉率 $HR = N_{unsupported} / N_{statements}$、时序一致性率 $TCR = \frac{1}{N}\sum_i \mathrm{tIoU}(\tau_i^{pred}, \tau_i^{gt})$。

### 3.3 DAG · 退化感知门控与置信度弃权（Degradation-Aware Gating）

**定位**：将输入质量设为显式建模变量，让系统在退化条件下自动降级并显式表达不确定性，并降低高置信错误告警的发生风险。

**（a）质量评估**：Q-Net 在片段级预测质量分（输入为原始片段，与视觉塔并行、互不共享权重）：

$$q = \mathrm{QNet}(X) \in [0,1]$$

Q-Net 结构为 3 层卷积 + 全局平均池化 + 1 层全连接，约 0.2 M 参数；监督标签由退化类型与强度**自动生成**（干净 = 1，退化 = 强度映射分）。

**（b）门控函数**：

$$g(q) = \sigma\!\Big(\frac{\tau_g - q}{T_g}\Big), \qquad \tau_g = 0.5,\quad T_g = 0.15$$

质量越低（$q$ 越小），$g$ 越接近 1，打分越依赖检索与先验；质量高时 $g \to 0$，退回常规视觉-文本路径。

**（c）融合打分**（逐帧 $t$）：

$$S^{(t)} = (1 - g)\cdot s_{vl}^{(t)} + g\cdot\big(0.7\, s_{ret}^{(t)} + 0.3\, s_{prior}^{(t)}\big)$$

其中 $s_{vl}$ 为视觉-文本对齐分，$s_{ret}$ 为检索证据分，$s_{prior}$ 为定义 / 规则先验分。融合后的分数经时间平滑得到 $\hat{S}$。

**（d）弃权规则（检测侧）**：以片段级融合分数 $s = \mathrm{Mean}_t(\hat S^{(t)})$ 判定

$$\lvert s - \tau_s \rvert < \delta \;\Longrightarrow\; a = 1 \quad (\text{低置信，转人工复核}), \qquad \tau_s = 0.5,\quad \delta = 0.08$$

**（e）评测定义**：DAG 的收益由退化鲁棒性指标度量——相对性能保持率 $RPR = M_{deg} / M_{clean}$、阈值漂移 $\Delta\tau = \lvert \tau^{*}_{deg} - \tau^{*}_{clean}\rvert$、置信度校准误差 $ECE = \sum_{m=1}^{M} \frac{\lvert B_m \rvert}{n}\lvert acc(B_m) - conf(B_m) \rvert$，以及弃权选择性 $ASD$（弃权样本中真困难样本的比例）。

---

## 4. 损失函数

### 4.1 联合训练目标

$$L_{total} = L_{score} + 0.3\,L_{EA} + 0.2\,L_{gate} + 0.1\,L_{reg}$$

### 4.2 各项定义

**（a）$L_{score}$ · 检测打分损失**（BCE + 排序）

$$L_{score} = L_{BCE} + \lambda_{rank}\, L_{rank}$$

$$L_{BCE} = -\frac{1}{T}\sum_{t=1}^{T}\Big[\,y_t \log \hat{S}^{(t)} + (1 - y_t)\log\big(1 - \hat{S}^{(t)}\big)\Big]$$

$$L_{rank} = \frac{1}{\lvert \mathcal{P} \rvert \lvert \mathcal{Q} \rvert}\sum_{p \in \mathcal{P}}\sum_{q \in \mathcal{Q}} \max\big(0,\ m - (\hat S^{(p)} - \hat S^{(q)})\big)$$

其中 $y_t$ 为帧级标签（仅评测与消融使用；训练以片段级标签构造监督），$\mathcal{P}$ / $\mathcal{Q}$ 为片段内正 / 负帧集合，$m$ 为排序间隔，$\lambda_{rank}$ 为 **由验证集确定**。

**（b）$L_{EA}$ · 证据对齐损失**（InfoNCE，权重 $0.3$）

$$L_{EA} = -\log \frac{\exp\!\big(\mathrm{sim}(h_{exp}, h_{z^{*}}) / \tau_c\big)}{\sum_{k}\exp\!\big(\mathrm{sim}(h_{exp}, h_{z_k}) / \tau_c\big)}, \qquad \tau_c = 0.07$$

**（c）$L_{gate}$ · 质量预测损失**（权重 $0.2$）

$$L_{gate} = -\frac{1}{B}\sum_{b=1}^{B}\Big[\,q_b^{*}\log q_b + (1 - q_b^{*})\log(1 - q_b)\,\Big]$$

其中 $q_b^{*}$ 为第 $b$ 个样本由退化类型与强度自动生成的质量标签（干净样本 $q^{*} = 1$，退化样本按强度映射）。

**（d）$L_{reg}$ · LoRA 参数正则**（权重 $0.1$）

$$L_{reg} = \lVert \theta_{DA} \rVert_2^2 = \sum_{l \in \text{末 4 层}} \big(\lVert A_l \rVert_F^2 + \lVert B_l \rVert_F^2\big)$$

用于抑制低秩旁路在小样本上的过拟合。

### 4.3 梯度作用对象

| 损失项 | 权重 | 参与梯度的参数 | 冻结部分 |
|---|---|---|---|
| $L_{score}$ | 1.0 | 打分层（打分头权重） | 视觉塔、文本塔、LLM |
| $L_{EA}$ | 0.3 | 证据对齐投影头（2 层 MLP，约 0.6 M） | 主干 LLM、视觉塔 |
| $L_{gate}$ | 0.2 | Q-Net（约 0.2 M） | 其余全部 |
| $L_{reg}$ | 0.1 | LoRA 的 $A, B$（约 4.7 M） | $W_0$ 与其余视觉层 |

**梯度隔离原则**：$L_{EA}$ 的梯度不流入视觉塔与 LLM 主干；$L_{gate}$ 的梯度不流入视觉塔；只有 $L_{score} + L_{reg}$ 会更新 LoRA。该设计保证「解释约束不伤害检测主干」，也是实验方案为 EAD 设置 Go/No-Go 条件（AUC 下降 > 1 个百分点即 No-Go）的技术依据。

---

## 5. 训练与推理流程

### 5.1 训练流程（四阶段）

| 阶段 | 训练对象 | 冻结对象 | 优化器 / 学习率 | epoch | batch | 备注 |
|---|---|---|---|---|---|---|
| 阶段一 | Q-Net（约 0.2 M） | 全部主干 | AdamW / $1\times10^{-3}$ | 10 | 8 | 标签由退化类型与强度自动生成；AMP FP16；wd $1\times10^{-2}$ |
| 阶段二 | DAA（LoRA，约 4.7 M）+ 打分头 | 视觉塔其余层、文本塔、LLM | AdamW / LoRA $1\times10^{-4}$，打分头 $5\times10^{-4}$ | 20 | 2（梯度累积 8，等效 16） | warm-up 2 epoch + cosine decay，min lr $1\times10^{-6}$ |
| 阶段三 | EAD 证据对齐投影头（约 0.6 M） | 主干 LLM、视觉塔 | AdamW / $5\times10^{-4}$ | 15 | 4 | warm-up 1 epoch + cosine decay；$\tau_c = 0.07$ |
| 阶段四 | LoRA + 打分头 + 投影头 + Q-Net（联合微调） | 视觉塔其余层、文本塔、LLM | AdamW / 沿用阶段一至三的分组学习率（Q-Net $1\times10^{-3}$，投影头与打分头 $5\times10^{-4}$，LoRA $1\times10^{-4}$） | 20 | 2（梯度累积 8） | 使用 $L_{total}$ 联合目标；weight decay $1\times10^{-2}$ |

**训练顺序的理由**：先用最简单的一维信号把各部分单独校准（Q-Net 只需退化标签；DAA 只需检测标签；投影头只需证据标签），避免多变量同时变更导致归因失败；最后再做联合微调，让三个模块在共享目标下互补。这与实验方案「按 DAA → EAD → DAG 顺序单变量接入，每接入一项即记录一次完整指标」的验证纪律一致。

**统一训练配置**：优化器 AdamW；weight decay $1\times10^{-2}$；AMP FP16；学习率调度 warm-up + cosine decay；硬件 1×RTX 4090 24GB / i9-13900K / RAM 64GB；软件 Ubuntu 22.04 / Python 3.10 / PyTorch 2.2 / CUDA 12.1。

### 5.2 推理流程（step-by-step）

1. **片段切分**：从视频流按 8 fps 采样构造 32 帧片段 $X \in [32,3,224,224]$。
2. **质量评估**：$q = \mathrm{QNet}(X)$（片段级标量）。
3. **视觉前向**：冻结视觉塔 + DAA 旁路逐帧前向，得到 patch tokens $[32,197,768]$，池化为帧级特征 $F \in [32,768]$；时间池化得 $\bar f \in [768]$。
4. **文本对齐**：用冻结文本塔得到 prompt 嵌入 $E_{txt} \in [K,768]$，逐帧计算余弦相似度并对 $K$ 取均值 → $S_{vl} \in [32]$。
5. **记忆检索**：以 $\bar f$ 在正常性记忆库 $M$ 中检索 top-$K = 8$ 邻居，得到索引集 $\mathcal{N}$；逐帧计算与这 8 个邻居的相似度均值 → $S_{ret} \in [32]$。
6. **先验计算**：由定义 / 规则先验得到 $S_{prior} \in [32]$。
7. **门控路径选择**：计算 $g = \sigma\big((\tau_g - q)/T_g\big)$。$g \to 0$ 采用常规路径（以 $S_{vl}$ 为主），$g \to 1$ 采用检索 / 先验主导路径（以 $0.7 S_{ret} + 0.3 S_{prior}$ 为主）；中间值按权重插值，不做硬切换。
8. **分数融合与平滑**：$S = (1-g) S_{vl} + g(0.7 S_{ret} + 0.3 S_{prior})$，再做时间平滑得到 $\hat S$。
9. **弃权判定**：以片段级分数 $s = \mathrm{Mean}_t(\hat S)$ 检验 $\lvert s - \tau_s\rvert < \delta$。若成立则置 $a = 1$，输出「低置信，转人工复核」，并在下游告警中降级处理。
10. **区间提取**：对 $\hat S$ 做阈值化 + 连通分量合并，得到异常时间区间集合 $I$。
11. **证据解码**：构造证据槽位 $Z$（由 $\hat S$ 的局部极大与检索邻居共同生成），冻结 LLM 在 schema 约束下解码，输出证据引用 $E$ 与 explanation 文本。
12. **解释侧弃权**：若 $\max_k \mathrm{sim}(h_{exp}, h_{z_k}) < \theta_{ev}$，把 explanation 替换为「证据不足，拒绝判定」。
13. **输出**：返回 $(S,\ I,\ E,\ (c,\ a))$ 四元组。

### 5.3 与 Baseline 的差异对照表

| 维度 | Baseline B0 | EviVAD（完整方法） |
|---|---|---|
| 视觉塔 | 冻结 CLIP ViT-B/16，无适配 | 冻结 + DAA 低秩旁路（末 4 层 Q/V，$r=4$，$\alpha=8$） |
| 输入质量建模 | 无，隐含假设输入干净 | Q-Net 显式预测 $q \in [0,1]$，并作为门控输入 |
| 打分路径 | 单一：视觉-文本对齐 | 两条路径按 $g$ 加权：常规路径 / 检索 + 先验主导路径 |
| 检索 | 无 | 正常性记忆库 top-$K=8$ 检索证据分 $S_{ret}$ |
| 输出 | 仅一个异常分数 | 帧级分数曲线 $S$、时间区间 $I$、证据引用解释 $E$、置信度与弃权 $(c,a)$ |
| 解释 | 自由文本，不引用证据 | 结构化 schema，强制证据引用，可被反例推翻 |
| 弃权能力 | 无 | 检测侧（$\lvert s-\tau_s\rvert<\delta$）与解释侧（对齐分 $<\theta_{ev}$）双弃权 |
| 可训练参数 | 0（免训练） | 5.5 M（DAA 4.7 + 投影头 0.6 + Q-Net 0.2） |
| 延迟 | 118 ms / 片段 | 147 ms / 片段（+24.6%） |
| 退化鲁棒性 | 退化网格平均 AUC 62.5，RPR 0.81 | 退化网格平均 AUC 71.3，RPR 0.92 |
| 解释可验证性 | EAR 41.5 / CFS 38.7 / HR 26.4 | EAR 68.4 / CFS 61.3 / HR 9.8 |

---

## 6. 核心伪代码

### 6.1 完整方法前向（补全版）

```python
def evivad_forward(X, memory, rules, cfg):
    """
    X      : [T=32, 3, 224, 224]  摄像头视频片段
    memory : [N, D]               检索增强正常性记忆库（不参与梯度）
    rules  : 定义 / 规则先验知识
    返回   : 帧级分数曲线 / 异常区间 / 证据引用 / 解释 / 置信度 / 弃权标志
    """
    # ---------- 1. 质量评估（DAG 输入，片段级） ----------
    q = qnet(X)                                       # 标量 ∈ [0,1]

    # ---------- 2. 视觉前向：冻结塔 + DAA 低秩旁路 ----------
    tokens = vision_tower(X)                          # [T, 197, 768]
    F      = token_pool(tokens)                       # [T, 768]
    f_bar  = F.mean(dim=0)                            # [768]

    # ---------- 3. 文本对齐分 ----------
    E_txt = text_tower(PROMPTS)                       # [K, 768]（冻结）
    S_vl  = cosine_sim(F, E_txt).mean(dim=-1)         # [T]

    # ---------- 4. 检索增强正常性记忆 ----------
    idx = topk_search(f_bar, memory, k=cfg.topk)      # |idx| = 8
    retrieved = idx.numel() > 0
    if retrieved:
        S_ret = cosine_sim(F, memory[idx]).mean(dim=-1)   # [T]
    else:
        S_ret = torch.zeros_like(S_vl)                    # 索引为空 → 降级

    # ---------- 5. 定义 / 规则先验分 ----------
    S_prior = rule_score(F, rules)                    # [T]

    # ---------- 6. DAG 门控与融合 ----------
    g = torch.sigmoid((TAU_G - q) / T_G)              # 标量 ∈ [0,1]
    if retrieved:
        S = (1 - g) * S_vl + g * (0.7 * S_ret + 0.3 * S_prior)
    else:                                             # 检索缺失：权重重归一化到先验
        S = (1 - g) * S_vl + g * S_prior
    S_hat = temporal_smooth(S)                        # [T]，滑动平均 / 中值滤波

    # ---------- 7. 检测侧弃权 ----------
    s = S_hat.mean()                                  # 片段级融合分数
    a = int(abs(s - TAU_S) < DELTA)                   # 1 = 低置信，转人工

    # ---------- 8. 异常时间区间 ----------
    intervals = extract_intervals(S_hat, thr=TAU_S)   # 阈值化 + 连通分量合并

    # ---------- 9. EAD 证据锚定解码 ----------
    slots = build_evidence_slots(S_hat, memory, idx)  # [(t_s, t_e, cue), ...]
    out   = evidence_decode(F, slots, s, cfg)         # 冻结 LLM，schema 约束
    if out.max_sim < cfg.theta_ev:                    # 解释侧弃权
        out.explanation = "证据不足，拒绝判定"
        out.evidence    = []

    # ---------- 10. 四类输出 ----------
    return {
        "score":       S_hat,                # 帧级异常分数曲线   [T]
        "intervals":   intervals,            # 异常时间区间       list
        "evidence":    out.evidence,         # 证据引用           list
        "explanation": out.explanation,      # 自然语言解释       str
        "confidence":  torch.sigmoid(s),     # 置信度             [0,1]
        "abstain":     a,                    # 弃权标志           {0,1}
        "gate":        float(g),             # 门控权重（可解释性附加输出）
        "quality":     float(q),             # 质量分（可解释性附加输出）
    }
```

### 6.2 DAA 注入

```python
# 只替换末端 4 层（第 9–12 层）的 q_proj / v_proj
for blk in vision_tower.blocks[-4:]:
    blk.attn.q_proj = LoRALinear(blk.attn.q_proj, r=4, alpha=8, dropout=0.05)
    blk.attn.v_proj = LoRALinear(blk.attn.v_proj, r=4, alpha=8, dropout=0.05)

freeze_except(vision_tower, keep=[LoRALinear])   # 其余全部 requires_grad = False

class LoRALinear(nn.Module):
    def __init__(self, base, r=4, alpha=8, dropout=0.05):
        super().__init__()
        self.base = base                            # W0，冻结
        for p in self.base.parameters():
            p.requires_grad = False
        self.A = nn.Parameter(kaiming_init(nn.Linear(base.in_features, r, bias=False)))
        self.B = nn.Parameter(torch.zeros(base.out_features, r))   # 零初始化
        self.scale = alpha / r
        self.drop = nn.Dropout(dropout)

    def forward(self, x):                           # x: [..., D]
        return self.base(x) + self.scale * (self.drop(x) @ self.A.weight.T @ self.B.T)

# 训练只更新 LoRA 与打分层
opt = AdamW([p for p in model.parameters() if p.requires_grad], lr=1e-4)
```

### 6.3 EAD 约束解码

```python
def evidence_decode(F, slots, score, cfg):
    """slots: [(t_s, t_e, cue), ...]；LLM 主干冻结，只更新投影头"""
    # 1) 槽位编码
    h_slot = probe(encode_slots(slots))            # [K_slot, d_c]

    # 2) schema 约束解码（证据字段必填）
    out = llm.generate(prompt=F_summary + slot_prompt,
                       schema=EVIDENCE_SCHEMA,
                       temperature=0.2, do_sample=False)

    # 3) 解释表征与对齐分
    h_exp = probe(pool(out.tokens))                # [d_c]
    sims  = cosine_sim(h_exp.unsqueeze(0), h_slot) # [K_slot]
    out.max_sim = float(sims.max())

    # 4) 训练期：InfoNCE 证据对齐损失
    if training:
        loss_ea = info_nce(h_exp, h_slot, z_star=gt_slot_index(slots, out), tau=0.07)
        (0.3 * loss_ea).backward()                 # 只更新 probe
    return out
```

### 6.4 DAG 门控

```python
def dag_gate(frames, memory, rules, F, S_vl):
    q  = qnet(frames)                              # 质量分 [0,1]
    f_bar = F.mean(dim=0)
    idx = topk_search(f_bar, memory, k=8)

    s_ret   = cosine_sim(F, memory[idx]).mean(-1) if idx.numel() else None
    s_prior = rule_score(F, rules)

    g = torch.sigmoid((TAU_G - q) / T_G)           # TAU_G=0.5, T_G=0.15
    if s_ret is None:
        s = (1 - g) * S_vl + g * s_prior           # 检索缺失 → 先验主导
    else:
        s = (1 - g) * S_vl + g * (0.7 * s_ret + 0.3 * s_prior)

    abstain = abs(s.mean().item() - TAU_S) < DELTA # TAU_S=0.5, DELTA=0.08
    return s, g, abstain, q
```

---

## 7. 工程代码目录

```text
evivad/
├── configs/evivad_vlm.yaml            # 主干、LoRA、门控与阈值配置
├── datasets/ucf_crime.py              # 主数据集读取与片段采样
├── datasets/degradation.py            # 退化网格注入（4 类 × 3 级，固定种子）
├── datasets/counterfactual.py         # 反事实样本构造（证据移除 / 替换）
├── models/domain_adapter.py           # DAA：LoRA 注入与冻结控制
├── models/evidence_decoder.py         # EAD：证据槽位与结构化解码
├── models/quality_gate.py             # DAG：Q-Net、门控与弃权
├── losses/evidence_alignment.py       # L_EA（InfoNCE）
├── metrics/vad_metrics.py             # AUC / AP / mAP@0.5 / RPR / ECE
├── metrics/explanation_metrics.py     # EAR / CFS / HR / TCR + schema 校验
├── eval/degradation_grid.py           # 退化网格统一评测入口
├── train_adapters.py                  # 只训练 LoRA 与打分层
├── evaluate.py                        # 干净集 + 退化集 + 跨域评测
└── tests/test_tensor_shapes.py        # 张量尺寸与 schema 单测
```

| 文件 | 职责（一句话） |
|---|---|
| `configs/evivad_vlm.yaml` | 集中管理主干、LoRA（$r/\alpha$/dropout）、门控（$\tau_g, T_g$）、弃权（$\tau_s, \delta, \theta_{ev}$）与损失权重；保证一次改配置即可复现整组实验。 |
| `datasets/ucf_crime.py` | 读取 UCF-Crime 官方划分与标注，按 8 fps、32 帧协议切片段并做 224×224 归一化。 |
| `datasets/degradation.py` | 按 4 类退化 × 3 强度生成 12 种评测配置，固定随机种子并缓存退化结果。 |
| `datasets/counterfactual.py` | 构造证据移除 / 替换的反事实样本，供 CFS 与 $L_{EA}$ 使用。 |
| `models/domain_adapter.py` | 实现 `LoRALinear`、`inject_lora()`、`freeze_except()`，即 DAA 的全部逻辑。 |
| `models/evidence_decoder.py` | 构造证据槽位、约束解码出 schema、计算解释表征与最大对齐分（EAD）。 |
| `models/quality_gate.py` | 实现 Q-Net、门控函数 $g(q)$、融合打分与弃权判定（DAG）。 |
| `losses/evidence_alignment.py` | InfoNCE 形式的 $L_{EA}$，含温度 $\tau_c$ 与真值槽位索引逻辑。 |
| `metrics/vad_metrics.py` | 计算 AUC / AP / mAP@0.5 / RPR / ECE，是全流程统一使用的检测指标定义来源。 |
| `metrics/explanation_metrics.py` | 计算 EAR / CFS / HR / TCR，并校验输出 schema 合法性（含幻觉判定与人工抽检接口）。 |
| `eval/degradation_grid.py` | 退化网格统一评测入口，干净集与退化集共用同一脚本与阈值协议。 |
| `train_adapters.py` | 阶段二训练入口：只训练 LoRA 与打分层。 |
| `evaluate.py` | 推理与评测入口：干净集、退化集、跨域集三类评测均由该入口执行。 |
| `tests/test_tensor_shapes.py` | 断言各环节张量尺寸与 schema 结构，防止改动破坏数据流契约。 |

---

## 8. 复现检查清单

| # | 检查项 | 要求 | 如何验证通过 |
|---|---|---|---|
| 1 | 数据划分固定 | UCF-Crime 使用官方 1610 训练 / 290 测试；XD-Violence、UBnormal、MSAD 只做零微调外测，绝不进入训练 | 打印训练脚本实际读取的文件列表，与官方划分清单逐行比对；测试集样本 ID 不得出现在任何训练日志中 |
| 2 | 随机种子固定 | 统一使用 42 / 3407 / 2026 三个种子；报告「均值 ± 标准差」 | 每个种子独立执行完整流程，检查三次运行的初始 LoRA 参数、数据打乱顺序一致；若标准差 > 平均增益则判定该模块收益不稳定 |
| 3 | 退化注入固定种子并缓存 | 12 种退化配置（4 类 × 3 级）离线生成一次并缓存，评测时直接读取 | 每次评测打印退化缓存的哈希值；重跑得到的哈希一致即通过；评测脚本不得在运行时重新生成退化数据 |
| 4 | 阈值只在验证集调参 | 门控 $\tau_g, T_g$、弃权 $\tau_s, \delta$、证据阈值 $\theta_{ev}$、排序权重 $\lambda_{rank}$ 全部在验证集上确定后冻结 | 检查配置文件中的阈值来源标注；测试集上不得出现任何阈值搜索代码路径；把测试集换一份数据重跑，阈值应保持不变 |
| 5 | 统一评测脚本 | 干净集、退化集、跨域集共用 `eval/degradation_grid.py` + `metrics/vad_metrics.py` | 三份评测结果文件的脚本版本号与指标定义一致；禁止为主表单独改写指标实现 |
| 6 | 统一输入协议 | 32 帧 / 片段、8 fps 采样、resize 224×224、ImageNet 归一化 | `tests/test_tensor_shapes.py` 断言首层输入形状为 $[32,3,224,224]$；比对任意两条样本的帧间隔为 125 ms |
| 7 | LoRA 零初始化等价性 | $B$ 零初始化，训练起点前向输出与 Baseline B0 一致 | 加载 adapter 后、未训练前，对同一批样本比较 B0 与 DAA 版本的输出差异，应小于数值精度误差（如 $< 10^{-6}$） |
| 8 | 梯度作用对象正确 | 只有 LoRA / 打分头 / 证据投影头 / Q-Net 参与梯度；视觉塔、文本塔、LLM 主干全程冻结 | 反向传播后遍历 `named_parameters()`，打印所有 `grad is not None` 的参数名，应只落在上述四类；冻结参数梯度必须为 `None` |
| 9 | 输出 schema 合法 | 每条解释满足 `{score, evidence:[{t_start,t_end,cue}], explanation}` | `metrics/explanation_metrics.py::validate_schema()` 对全测试集 100% 通过；非法输出计数为 0 |
| 10 | 指标自洽 | 完整方法 ≥ 双模块 ≥ 单模块 ≥ Baseline B0（HR 方向相反，越低越优） | 消融表逐行做单调性断言；同时校验参数量 4.7 + 0.6 + 0.2 = 5.5 M 与完整方法一致 |
| 11 | 证据标注与复核 | 800 段抽样片段建立「最小充分证据集 + 干扰证据 + 反事实标签」三项机制，其中 20% 人工复核 | 统计复核一致率并留档；EAR / CFS 只在该 800 段子集上报告，不得在全测试集上报告 |
| 12 | 环境与版本固定 | Ubuntu 22.04 / Python 3.10 / PyTorch 2.2 / CUDA 12.1；1×RTX 4090 24GB | 导出 `pip freeze` 与 `nvidia-smi` 输出随结果一并归档；换机复跑同一配置得到同一指标（容差内） |
| 13 | 效率实测可复现 | 延迟、显存、吞吐按统一规范测量（同批次大小、同预热次数） | 每个配置预热 20 次、计时 100 次取中位数；报告 FPS 与显存峰值，与汇总值分栏标注，不得混写 |

---

## 9. 失败处理与边界情况

| # | 失败模式 | 触发条件 | 现象 | 应对方案 | 可验证判据 |
|---|---|---|---|---|---|
| 1 | 门控误伤正常输入 | 干净片段的 $q$ 被 Q-Net 低估，导致 $g \to 1$，打分切到检索 / 先验主导路径 | 干净集 AUC 下降、正常片段误报上升 | ① 阈值只在验证集调参并冻结；② 温度 $T_g = 0.15$ 保证软切换而非硬切；③ 对 $g$ 设上限裁剪 $g \leftarrow \min(g,\ g_{max})$，限制先验路径的最大权重；④ 若仍误伤，先修正 Q-Net 的质量标签映射再谈门控 | 干净集 AUC 相对 Baseline 下降 ≤ 0.3 个百分点为通过；> 1 个百分点即 **No-Go**（实验方案为 DAG 设定的未通过筛选线） |
| 2 | 证据对齐在人群密集片段失效 | 多目标重叠、候选区间互相覆盖，证据槽位无法唯一对应真值 | EAR 明显低于整体均值、CFS 不稳定 | ① 槽位去重与最近邻冲突检测，合并 IoU 过高的相邻槽位；② 对密集片段降低证据粒度（合并为更粗的区间）；③ 由 $\theta_{ev}$ 触发解释侧弃权而非强行给解释；④ 在 800 段中单列「密集子集」单独报告，不做整体掩盖 | 密集子集 EAR 与整体 EAR 的差值需在报告中显式给出；若密集子集 EAR < 整体的 0.7 倍，则判定该模块在密集场景不适用 |
| 3 | 弃权阈值对召回的影响 | $\delta$ 过大，把大量正确的高置信判定也划入弃权 | 召回下降、弃权率异常升高 | ① 扫描 $\delta$ 并绘制「弃权率—召回」曲线，在验证集上按业务可承受的弃权率确定 $\delta$；② 弃权样本在报告中单列，不计入误报统计但不隐藏；③ 用 $ASD$（弃权选择性）监控弃权是否真的落在困难样本上 | 弃权率 ≤ 目标上限（当前设定：≤ 10%）且 $ASD$ 高于随机弃权基线；否则回退 $\delta$ |
| 4 | 检索记忆缺失 | 记忆库为空、索引未构建、或片段在所有邻居上相似度都低于接受阈值 | 检索路径给出无意义分数，退化场景下分数塌陷 | ① 显式 `retrieved = idx.numel() > 0` 判定；② 缺失时把融合权重从 $0.7\,s_{ret} + 0.3\,s_{prior}$ 重归一化为 $s_{prior}$ 主导，保证不退化为常数；③ 输出 `retrieval-miss` 标志位，便于事后统计命中率 | 在人为清空记忆库的对照实验里，方法退化到「先验主导」而非输出常数或 NaN；日志中 `retrieval-miss` 计数与预期一致 |
| 5 | 未见退化类型导致 Q-Net 失准 | 出现训练标签未覆盖的退化（如新型传感器噪声） | $q$ 分布漂移，门控长期停在错误一侧 | ① 质量标签只用退化强度映射、不绑定具体退化类型，保留泛化空间；② 监控 $q$ 的分布直方图，发现漂移时人工复核而非自动重训；③ 以 $g$ 的可解释性输出作为排障入口 | 新退化类型下 $q$ 仍单调反映质量劣化（与 RPR 同向变化）即视为可接受 |
| 6 | 证据槽位为空 | $\hat S$ 无局部极大、或检索邻居全部低于接受阈值 | 无候选证据可引用，schema 无法填充 | ① 允许 schema 输出空证据 + 显式弃权文案「证据不足，拒绝判定」；② 空槽位样本单独统计，不计入 EAR 分母以外的指标污染；③ 空槽位比例过高说明前端打分质量问题，应回到阶段二排查 | 空槽位比例与弃权率一并报告；schema 校验对空证据同样通过（不得因空证据报错） |

**总体边界原则**：任何一条降级路径都必须是**显式的、可观测的、可统计的**（输出标志位或计数），不允许静默回退。这是本架构把「弃权」作为一等输出的根本原因——宁可交给人，也不要给出高置信的错误告警。

---
