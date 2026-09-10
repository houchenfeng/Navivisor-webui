# CrackSAM-MVE：论文级算法架构与工程实现说明

> 状态：Demo 模拟设计稿（v1.0）。本文给出可实施的完整工程规格，但尚未进行真实训练；涉及效果的数值不得作为论文结论。

## 1. 问题定义与设计目标

给定道路 RGB 图像 $x\in\mathbb{R}^{H\times W\times3}$，模型输出裂缝概率图 $p\in[0,1]^{H\times W}$。目标是在 Crack500 的统一划分上，以冻结 SAM ViT-B 主干为前提，解决细长裂缝领域偏移、边界模糊和小裂缝漏检三个问题，同时控制可训练参数和推理成本。

完整模型命名为 **CrackSAM-MVE**，由四个阶段组成：

1. **冻结式视觉编码**：SAM ViT-B 将 1024×1024 输入编码为 64×64×256 特征。
2. **低秩领域适配（DLA）**：在最后 4 个 Transformer Block 的 Query/Value 投影中插入 LoRA。
3. **边界增强掩码解码（BED）**：Mask Decoder 输出区域概率，并由边界监督保持细长结构连续。
4. **粗到细多尺度提示（CMP）**：由第一阶段粗 Mask 自动生成点/框提示，仅重复 Prompt Encoder 与 Mask Decoder 完成细化。

## 2. 数据流与张量规格

```text
RGB image [B,3,H,W]
  -> resize + pad [B,3,1024,1024]
  -> frozen SAM ViT-B + LoRA(Q,V,last 4 blocks)
  -> image embedding [B,256,64,64]
  -> empty/dense prompt -> prompt embedding
  -> boundary-enhanced mask decoder
  -> coarse logits [B,1,256,256]
  -> connected components(top-3, confidence>=0.45)
  -> center points + expanded boxes(scale=1.10)
  -> original-scale and 1.5x local refinement
  -> confidence-weighted fusion
  -> bilinear resize/crop restoration [B,1,H,W]
```

## 3. 模块一：低秩领域适配器 DLA

对最后四个 Block 中的 $W_q,W_v$ 施加：

$$h'=Wh+\frac{\alpha}{r}BAh,$$

其中 $r=4$、$\alpha=8$，$A\in\mathbb{R}^{r\times d}$ 使用 Kaiming 初始化，$B\in\mathbb{R}^{d\times r}$ 零初始化。原权重 $W$ 冻结，仅更新 $A,B$ 与 Mask Decoder。训练阶段 LoRA dropout=0.05，推理时关闭。不得修改 Patch Embed、位置编码和前 8 个 Transformer Block，以确保单变量验证。

## 4. 模块二：边界增强解码器 BED

区域损失为 BCE 与 soft Dice 的等权组合。真实边界由二值标签分别执行一次 3×3 膨胀、腐蚀并取差得到，边界损失使用加权 BCE：

$$L=L_{bce}+L_{dice}+0.2L_{boundary}.$$

Dice 平滑项为 $10^{-6}$。边界正类权重按当前 batch 的负/正像素比动态计算并裁剪到 [1, 20]，防止极细边界导致梯度爆炸。若验证集 Dice 连续 5 个 epoch 不提升则早停。

## 5. 模块三：粗到细多尺度提示 CMP

粗概率图以 0.45 阈值二值化，移除面积小于 16 像素的连通域并保留置信度最高的 3 个。每个连通域生成质心正点及向外扩张 10% 的包围框。原图尺度与以包围框为中心的 1.5×局部裁剪分别解码，图像编码特征只计算一次。最终概率为：

$$p=0.4p_{coarse}+0.35p_{box}+0.25p_{local}.$$

无有效连通域时直接返回粗 Mask；局部裁剪越界时使用反射填充。最终阈值固定为 0.5，不在测试集调参。

## 6. 训练、推理与复现配置

| 项目 | 统一设置 |
|---|---|
| 数据集 | Crack500 train/val/test = 250/50/200；DeepCrack 537 张仅作零微调外部测试 |
| 输入 | 1024×1024，保持长宽比后右下零填充 |
| 增强 | 水平翻转 0.5、随机旋转 ±10°、ColorJitter 0.2；验证/测试无增强 |
| 优化器 | AdamW，LoRA lr=1e-4，Decoder lr=5e-4，weight decay=1e-2 |
| 调度器 | 5 epoch warm-up + cosine decay，最低 lr=1e-6 |
| 训练 | 50 epoch，batch=2，梯度累积=4，有效 batch=8，AMP FP16 |
| 随机性 | seeds={42,3407,2026}，报告 mean±std |
| 硬件 | 1×NVIDIA RTX 4090 24GB；CPU i9-13900K；RAM 64GB |
| 软件 | Ubuntu 22.04、Python 3.10、PyTorch 2.2、CUDA 12.1、cuDNN 8.9 |
| 计时 | batch=1，预热 50 次、统计 200 次；含预处理，不含磁盘 I/O |

## 7. 工程代码与目录职责

```text
cracksam/
├── configs/cracksam_vitb.yaml       # 唯一实验配置入口
├── datasets/crack500.py             # 划分校验、resize/pad、mask 二值化
├── models/lora.py                    # Q/V LoRA 注入与冻结检查
├── models/boundary_decoder.py        # 区域/边界联合输出
├── models/prompt_refiner.py          # 连通域、点框提示、多尺度融合
├── losses/boundary_loss.py           # BCE + Dice + Boundary
├── metrics/segmentation.py           # mIoU/Dice/Recall/Boundary-F1
├── train.py                          # AMP、累积梯度、早停、checkpoint
├── evaluate.py                       # 三种子聚合、速度/显存统计
└── tests/test_tensor_shapes.py       # 张量、越界框、空 Mask 回归测试
```

核心装配伪代码：

```python
sam = sam_model_registry['vit_b'](checkpoint=cfg.sam_ckpt)
freeze(sam.image_encoder)
inject_lora(sam.image_encoder.blocks[-4:], targets=('q_proj', 'v_proj'), rank=4, alpha=8)
decoder = BoundaryMaskDecoder.from_sam(sam.mask_decoder)

embedding = sam.image_encoder(image)
coarse = decoder(embedding, empty_prompt)
prompts = build_prompts(coarse.sigmoid(), topk=3, threshold=0.45)
refined = refine_and_fuse(embedding, coarse, prompts, scales=(1.0, 1.5), weights=(0.4, 0.35, 0.25))
loss = bce(refined, mask) + dice(refined, mask) + 0.2 * boundary(refined, mask)
```

## 8. 完整性检查与失败处理

- 启动时断言除 LoRA 和 Decoder 外所有参数 `requires_grad=False`。
- 每个 epoch 保存配置哈希、Git commit、随机种子及最佳验证 Dice checkpoint。
- 训练出现 NaN：先关闭 AMP 复测一个 batch，再检查空 Mask 的 Dice 分母与动态边界权重。
- 推理无连通域：禁止构造伪提示，直接退化为粗分割。
- Go：三随机种子 Dice 较 SAM Baseline 提升 ≥2.0 个百分点，Boundary-F1 提升 ≥4.0，额外延迟 ≤30%。
- No-Go：跨数据集 Dice 下降、增益小于标准差、或额外延迟超过 50%。

## 9. 文献与可核查声明

SAM 主体和提示式解码设计依据 P001 及其官方实现：https://github.com/facebookresearch/segment-anything 。LoRA 注入位置、裂缝边界损失权重和多尺度融合系数是本 Demo 的 MVE 建议值，必须在真实实验中按上述消融顺序核实。
