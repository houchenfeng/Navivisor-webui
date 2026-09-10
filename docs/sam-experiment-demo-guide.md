# SAM 实验智能体 Demo 演示指南

## 演示数据

测试包位于：

```text
G:\navi-agent\VIBE_RESEARCH_SAM_DEMO\vibe-research-demo-sam
```

其中包含：

- `literature.csv`：包含一篇《Segment Anything》论文的标准文献 CSV；
- `pdf/P001_segment_anything.pdf`：真实 SAM 论文全文，共 12 页；
- `research_input.md`：演示课题信息；
- `expected_demo_output.md`：道路裂缝分割实验的模拟预期结果。

CSV 中的 `./pdf/P001_segment_anything.pdf` 相对路径已验证存在。

## 启动和登录

打开：

```text
http://127.0.0.1:8172
```

本地预览密钥：

```text
navivisor-dev
```

登录后点击左侧“实验”，进入 `/research/experiment/intake`。

## 3–5 分钟演示流程

### 1. 课题与文献

不要点击内置“Demo 数据”，请手工填写 SAM 测试课题。

项目名称：

```text
RoadCrack-SAM-MVP
```

研究题目：

```text
面向小样本道路裂缝分割的轻量化 SAM 适配方法
```

研究目标：

```text
基于 Segment Anything 的可提示分割能力，设计适用于道路裂缝的低成本领域适配方案，重点提升细长结构连续性和小裂缝召回率，并通过消融实验验证各模块贡献。
```

上传：

```text
G:\navi-agent\VIBE_RESEARCH_SAM_DEMO\vibe-research-demo-sam\literature.csv
```

确认页面显示 `literature.csv · 1 篇论文`，然后点击“生成实验方案”。

### 2. 方案确认

展示 Idea 卡片中的改进层级、研究假设、预计提升和 Go/No-Go 标准，然后点击“确认方案”。

讲解重点：每个 Idea 尽量只改变一个模块，方便后续消融。

### 3. 模式选择

确认“本地真实运行”处于禁用状态。勾选：

```text
我理解模拟结果仅用于 Demo 和方案比较，不能作为真实论文证据。
```

然后点击“继续配置”。

### 4. 模拟配置

保持默认配置：随机种子 `42`、重复次数 `3`、提升范围 `-2%～+8%`，点击“开始模拟”。

### 5. 实验执行

等待约 3 秒，观察 Idea 从等待变为成功、失败或淘汰。强调这是离线模拟结果播放，没有执行训练或 GPU 任务。

进度达到 100% 后点击“查看成果”。

### 6. 成果交付

展示：

- 恰好 3 个最佳创新点；
- 方法流程、效果对比、训练曲线三张 SVG 图；
- 模拟 SOTA 对比表和模拟消融表；
- “模拟模式不生成可运行代码”警告。

点击“下载 Markdown”，检查 `final_experiment_report_simulated.md`。

## SAM 课题讲解口径

详细内容以测试包中的 `expected_demo_output.md` 为准：

- Baseline：冻结 SAM 图像编码器，仅训练轻量掩码解码头；
- 对比算法：U-Net、DeepLabV3+；
- 主指标：mIoU、Dice；
- 辅助指标：Boundary-F1、Recall；
- 最终方向：轻量领域适配、边界一致性学习、多尺度提示细化。

所有数值均为模拟结果。不要声称系统已经训练 SAM 或达到真实 SOTA。推荐表述：

> 系统基于文献锚点和保守区间生成实验预演，帮助研究者决定哪些模块值得进入真实训练验证。

## 当前 Demo 限制

- CSV 只在浏览器中完成字段和重复 ID 校验；
- 尚未真正调用 Codex 读取 CSV/PDF；
- 尚未执行 PDF 路径存在性检查；
- 页面和模拟结果目前是固定离线数据；
- Markdown 在浏览器端生成，图表和表格未分别写入项目目录。

因此现场应称其为“实验智能体交互 Demo”，而不是已完成真实文献分析或模型训练的生产版本。

## 重新开始演示

实验状态保存在浏览器 localStorage。需要清空时，在开发者工具中删除：

```text
navivisor-experiment-mvp
```

刷新页面即可从第一步开始。
