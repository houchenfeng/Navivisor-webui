# 交叉研究候选课题

## 偏可行：冻结视觉语言模型上的免训练监控异常判别

在不重新训练骨干网络的前提下，仅用公开视觉语言模型、文本定义和近期片段记忆，能否在监控视频上完成可用的异常打分？

核心做法是提示与记忆队列工程，依据包括 *Harnessing Large Language Models for Training-Free Video Anomaly Detection*、*MoniTor*、*AnyAnomaly*、*DR-VAD*。

## 偏创新：面向个体行为的双向因果图谱异常归因

监控异常能否不只给出片段分数，而是指出是哪个人、哪段因果关系被打破，并用可反驳的反例来检验解释？

核心做法是个体级因果图谱与可反证解释，依据包括 *Uncovering what, why and How*、*HoloTrace*、*TargetVAU*、*Enhancing Trustworthiness in VAD with Rule-Based VLM-LLM Explanations*。

## 较平衡：证据可验证且退化感知的监控视频异常检测

在统一实验设置中，领域适配、证据对齐的异常解释和退化条件下的可靠弃权，能否同时改善检测性能、可解释性与恶劣成像可靠性？

核心做法是跨域适配、证据对齐解释与退化感知弃权三条可分开验证的技术线，依据包括 *CLIP-Based Adaptive Semantic Alignment*、*MMVAD*、规则驱动的视觉语言解释，以及低光场景下的检索增强推理。
