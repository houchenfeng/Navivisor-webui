# method

```tex
\section{Method}
\label{sec:method}

\subsection{Overview and Problem Formulation}

Given a surveillance stream, we sample clips of length $T{=}32$ at $8$~fps, each frame resized to $H{=}W{=}224$ and normalised with ImageNet statistics, obtaining $X \in \mathbb{R}^{T \times 3 \times H \times W}$. The model $f_{\theta}$ outputs a tuple
\begin{equation}
\hat{y} = \big(S,\; I,\; E,\; (c, a)\big),
\end{equation}
where $S \in \mathbb{R}^{T}$ is a frame-level anomaly score curve, $I{=}\{(t_s^{(i)}, t_e^{(i)})\}$ a set of temporal anomaly intervals, $E$ an explanation with evidence citations, and $c \in [0,1]$, $a \in \{0,1\}$ the confidence and abstention flag. Training uses clip-level anomaly labels only; frame-level annotations are used for evaluation only.

The data flow of \evivad{} is shown in Fig.~\ref{fig:framework}. A raw clip first enters the quality probe Q-Net to produce a quality score $q$. In parallel it passes through a \emph{fully frozen} vision encoder (CLIP ViT-B/16), where DAA injects low-rank bypasses into the last four blocks, yielding frame-level visual features $F$. A frozen text tower supplies prompt embeddings for abnormal/normal descriptions. The clip-level feature retrieves its top-$K$ ($K{=}8$) neighbours from a retrieval-augmented normality memory to form a retrieval evidence score. DAG blends the two scoring paths continuously according to $q$. The fused score is temporally smoothed and passed to EAD, which decodes an evidence-cited explanation under a structural constraint. Tensor shapes at every stage are listed in Table~\ref{tab:tensor}.

\begin{figure*}[t]
\centering
\includegraphics[width=\linewidth]{framework.png}
\caption{Algorithmic framework of \evivad{} (illustrative). The input is a surveillance stream ($32$ frames per clip, $8$~fps); a degradation grid can optionally be injected. The backbone is a fully frozen vision encoder, on top of which DAA injects Q/V low-rank increments. DAG uses the quality probe to re-weight a regular path against a retrieval/prior-driven path and to emit an abstention flag; EAD decodes the score into a structured explanation with temporal intervals and visual cues. Four outputs are produced: a frame-level score curve, temporal intervals, an evidence-cited explanation, and confidence/abstention flags.}
\label{fig:framework}
\end{figure*}

\begin{table}[t]
\centering
\small
\caption{Tensor shapes of \evivad{} ($T{=}32$, $D{=}768$; $K$ is the number of prompts and $N$ the memory size).}
\label{tab:tensor}
\begin{tabular}{lll}
\toprule
Stage & Input & Output \\
\midrule
Clip sampling & stream & $[T,3,H,W]$ \\
Q-Net & $[T,3,H,W]$ & $q \in \mathbb{R}$ \\
Frozen tower + DAA & $[T,3,H,W]$ & $[T,197,D]$ \\
Frame pooling & $[T,197,D]$ & $F \in [T,D]$ \\
Temporal pooling & $[T,D]$ & $\bar{f} \in [D]$ \\
Text tower (frozen) & prompts & $E_{txt} \in [K,D]$ \\
Alignment score & $F, E_{txt}$ & $S_{vl} \in [T]$ \\
Memory retrieval & $\bar{f}, M$ & $\mathcal{N}$, $|\mathcal{N}|{=}8$ \\
Retrieval score & $F, M, \mathcal{N}$ & $S_{ret} \in [T]$ \\
DAG gating & $q$ & $g \in \mathbb{R}$ \\
Fusion + smoothing & $S_{vl}, S_{ret}, S_{pri}, g$ & $\hat{S} \in [T]$ \\
Evidence decoding (EAD) & $F, Z$ & $E$, explanation \\
\bottomrule
\end{tabular}
\end{table}

\subsection{DAA: Low-Rank Domain Adaptation}

\paragraph{Motivation.} The cost of Challenge~1 (domain shift) should not be borne by retraining a whole large model. Low-rank adaptation is attractive because it starts from a point that is numerically identical to the baseline (with a zero-initialised up-projection) and injects domain information layer by layer, while its footprint is small enough to allow ``one adapter per scene''.

\paragraph{Definition.} For the $q_{\text{proj}}$ and $v_{\text{proj}}$ of the last four Transformer blocks (layers $9$--$12$) of the vision encoder, we replace the frozen linear layer $h = W_0 x$ by
\begin{equation}
h = W_0 x + \frac{\alpha}{r}\, B\,(A x),
\end{equation}
where $W_0 \in \mathbb{R}^{D \times D}$ is frozen, $A \in \mathbb{R}^{r \times D}$ and $B \in \mathbb{R}^{D \times r}$. The scaling $\alpha/r$ keeps the effective learning rate comparable across ranks. $A$ is Kaiming-initialised and $B$ is \emph{zero-initialised}, so at the start of training $({\alpha}/{r}) B A x = 0$ and the model output is bit-wise identical to the baseline, which guarantees clean attribution in single-variable comparisons. We use $r{=}4$, $\alpha{=}8$ and dropout $=0.05$.

\paragraph{Data flow and implementation.} The input $[T,3,H,W]$ is forwarded frame by frame to patch tokens $[T,197,D]$, pooled into frame features $F \in [T,D]$. Only the LoRA parameters and the scoring layer are trained; the rest of the vision tower, the text tower and the LLM backbone stay frozen. The added trainable budget is $4.7$\,M (about $0.9\%$ of the backbone). At deployment time one scene corresponds to one adapter file of roughly $18$\,MB, which can be hot-swapped.

\subsection{EAD: Evidence-Anchored Decoding}

\paragraph{Motivation.} The root cause of Challenge~2 (unverifiable explanations) is that an explanation is free text whose claims cannot be inspected independently. Binding every claim to a checkable evidence slot turns an unfalsifiable narrative into a falsifiable assertion.

\paragraph{Evidence slots.} Candidate intervals are generated jointly from the local maxima of the coarse score curve and the retrieved normality memory, forming
\begin{equation}
Z = \{\, z_k = (t_s^{(k)},\; t_e^{(k)},\; \mathrm{cue}_k) \,\},
\end{equation}
where $t_s^{(k)} < t_e^{(k)}$ are interval endpoints and $\mathrm{cue}_k$ is a semantic cue extractable from the clip and its retrieved neighbours.

\paragraph{Structured output.} Decoding is constrained to a fixed schema in which the evidence field is mandatory: $\{\texttt{score},\ \texttt{evidence}[\{\texttt{t\_start},\texttt{t\_end},\texttt{cue}\}],\ \texttt{explanation}\}$.

\paragraph{Evidence-alignment loss.} Let $h_{exp}$ be the pooled representation of the explanation tokens, $h_{z_k}$ the encoding of slot $z_k$, $z^{*}$ the ground-truth slot, and $\tau_c{=}0.07$:
\begin{equation}
L_{EA} = -\log \frac{\exp\!\big(\mathrm{sim}(h_{exp}, h_{z^{*}})/\tau_c\big)}{\sum_{k} \exp\!\big(\mathrm{sim}(h_{exp}, h_{z_k})/\tau_c\big)}.
\end{equation}
This loss updates only a two-layer MLP evidence-alignment head ($\approx 0.6$\,M parameters); the LLM backbone remains frozen throughout.

\paragraph{Abstention.} When the maximum alignment score over slots falls below a threshold $\theta_{ev}$, the model refuses to answer:
\begin{equation}
\max_k \mathrm{sim}(h_{exp}, h_{z_k}) < \theta_{ev} \;\Longrightarrow\; \text{explanation} \leftarrow \text{``insufficient evidence''}.
\end{equation}

\subsection{DAG: Degradation-Aware Gating and Confidence Abstention}

\paragraph{Motivation.} The key to Challenge~3 (no graceful degradation) is not to be uniformly stronger under all conditions, but to make the system \emph{know when it cannot be trusted}. Abstention is central to deployability: it is better to hand a case to a human than to emit a confident false alarm.

\paragraph{Quality estimation and gating.} Q-Net predicts a clip-level quality score (three convolutional layers, global average pooling and one fully connected layer; $\approx 0.2$\,M parameters). Its supervision is generated automatically from the degradation type and severity (clean $=1$, degraded $=$ a severity-mapped score):
\begin{equation}
q = \mathrm{QNet}(X) \in [0,1], \qquad
g(q) = \sigma\!\Big(\frac{\tau_g - q}{T_g}\Big),
\end{equation}
with $\tau_g{=}0.5$ and $T_g{=}0.15$. The lower the quality, the closer $g$ is to $1$ and the more the score relies on retrieval and priors; for high quality $g \to 0$ and the regular path is restored.

\paragraph{Fused score.} Per frame $t$,
\begin{equation}
S^{(t)} = (1 - g)\, s_{vl}^{(t)} + g\,\big(0.7\, s_{ret}^{(t)} + 0.3\, s_{prior}^{(t)}\big),
\end{equation}
where $s_{vl}$, $s_{ret}$ and $s_{prior}$ denote the vision-text alignment, retrieval evidence and definition/rule prior scores respectively; the fused score is then temporally smoothed into $\hat{S}$.

\paragraph{Abstention rule.} Using the clip-level score $s = \mathrm{Mean}_t(\hat{S}^{(t)})$,
\begin{equation}
\lvert s - \tau_s \rvert < \delta \;\Longrightarrow\; a = 1,
\end{equation}
with $\tau_s{=}0.5$ and $\delta{=}0.08$. In that case the system reports ``low confidence, refer to human review'' and downgrades the downstream alarm.

\subsection{Objective Function}

The joint training objective of the three modules is
\begin{align}
L_{total} = {} & L_{score} + 0.3\,L_{EA} \nonumber \\
& + 0.2\,L_{gate} + 0.1\,L_{reg},
\end{align}
where the detection scoring loss combines binary cross-entropy with a ranking term,
\begin{equation}
L_{score} = L_{BCE} + \lambda_{rank} L_{rank}.
\end{equation}
$L_{BCE}$ is the frame-level binary cross-entropy and $L_{rank}$ a margin ranking loss over positive and negative frames within a clip; the quality-prediction loss $L_{gate}$ is a cross-entropy against the quality labels; and $L_{reg} = \lVert \theta_{DA} \rVert_2^2$ regularises the LoRA parameters to suppress overfitting of the low-rank bypass on small data.

\paragraph{Gradient isolation.} This is a key design choice: gradients from $L_{EA}$ do not flow into the vision tower or the LLM backbone, and gradients from $L_{gate}$ do not flow into the vision tower; only $L_{score} + L_{reg}$ update the LoRA parameters. This isolation guarantees that the explanation constraint does not damage the detection backbone and is the technical basis for the criterion in Sec.~\ref{sec:exp} that EAD fails if frame-level AUC drops by more than $1$ point.

\subsection{Training and Inference}

Training proceeds in four stages so that each part is first calibrated with the simplest one-dimensional signal, and only then jointly fine-tuned; this avoids multi-variable changes that would break attribution. (i) Q-Net is trained alone for $10$ epochs at a learning rate of $1\times10^{-3}$ with batch size $8$. (ii) DAA and the scoring layer are trained for $20$ epochs with learning rates $1\times10^{-4}$ (LoRA) and $5\times10^{-4}$ (scoring layer), batch size $2$ with $8$ gradient-accumulation steps. (iii) The EAD evidence head is trained for $15$ epochs at $5\times10^{-4}$ with batch size $4$. (iv) All four parameter groups are jointly fine-tuned for $20$ epochs using the same grouped learning rates. Every stage uses AdamW, weight decay $1\times10^{-2}$, AMP FP16 and a warm-up plus cosine schedule. The full forward and training procedure is given in Alg.~\ref{alg:evivad}.

\begin{algorithm}[t]
\caption{Training and forward procedure of \evivad{}}
\label{alg:evivad}
\begin{algorithmic}[1]
\REQUIRE clip $X$, memory $M$, rule prior $\mathcal{R}$, configuration $\theta$
\ENSURE score curve $\hat{S}$, intervals $I$, evidence $E$, confidence $c$, abstention $a$
\STATE $q \leftarrow \mathrm{QNet}(X)$ \COMMENT{clip-level quality}
\STATE $F \leftarrow \mathrm{VisionTower}_{\mathrm{DAA}}(X)$ \COMMENT{frozen tower + low-rank bypass}
\STATE $\bar{f} \leftarrow \mathrm{Mean}_t(F)$
\STATE $S_{vl} \leftarrow \mathrm{Mean}_k \cos(F, E_{txt})$
\STATE $\mathcal{N} \leftarrow \mathrm{TopK}(\bar{f}, M, K)$
\IF{$|\mathcal{N}| > 0$}
    \STATE $S_{ret} \leftarrow \mathrm{Mean}_{n \in \mathcal{N}} \cos(F, m_n)$
\ELSE
    \STATE $S_{ret} \leftarrow \mathbf{0}$ \COMMENT{retrieval miss, degraded path}
\ENDIF
\STATE $S_{pri} \leftarrow \mathrm{RuleScore}(F, \mathcal{R})$
\STATE $g \leftarrow \sigma\big((\tau_g - q)/T_g\big)$
\IF{$|\mathcal{N}| > 0$}
    \STATE $S \leftarrow (1-g) S_{vl} + g (0.7 S_{ret} + 0.3 S_{pri})$
\ELSE
    \STATE $S \leftarrow (1-g) S_{vl} + g S_{pri}$
\ENDIF
\STATE $\hat{S} \leftarrow \mathrm{Smooth}(S)$; \quad $s \leftarrow \mathrm{Mean}_t(\hat{S})$
\STATE $a \leftarrow \mathbb{1}\big[\,|s - \tau_s| < \delta\,\big]$
\STATE $I \leftarrow \mathrm{ExtractIntervals}(\hat{S}, \tau_s)$
\STATE $Z \leftarrow \mathrm{BuildSlots}(\hat{S}, M, \mathcal{N})$
\STATE $E \leftarrow \mathrm{Decode}_{\mathrm{schema}}(F, Z)$
\IF{$\max_k \mathrm{sim}(h_{exp}, h_{z_k}) < \theta_{ev}$}
    \STATE $E \leftarrow \varnothing$ \COMMENT{insufficient evidence, refuse}
\ENDIF
\RETURN $\hat{S}, I, E, \sigma(s), a$
\end{algorithmic}
\end{algorithm}
```
