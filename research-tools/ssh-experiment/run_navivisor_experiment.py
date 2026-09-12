#!/usr/bin/env python3
import argparse, csv, json, math, random, time
from pathlib import Path
p=argparse.ArgumentParser()
for name in ("data-dir","results-dir","document-dir","compute"): p.add_argument("--"+name,required=True)
p.add_argument("--title",default="Navivisor SSH experiment")
a=p.parse_args(); data=Path(a.data_dir); results=Path(a.results_dir); docs=Path(a.document_dir)
for d in (data,results,docs): d.mkdir(parents=True,exist_ok=True)
seed=23; rng=random.Random(seed); samples=[]
for i in range(1200):
 s=math.sin(i/31)+.35*math.cos(i/11)+rng.gauss(0,.12); y=int(abs(s)>1.05); score=min(1,max(0,.5+.34*s+rng.gauss(0,.08))); samples.append((i,s,y,score,int(score>=.5)))
with (data/"synthetic-evaluation.csv").open("w",newline="",encoding="utf-8") as f:
 w=csv.writer(f); w.writerow(["sample_id","signal","label","score","prediction"]); w.writerows(samples)
tp=sum(y==1 and z==1 for _,_,y,_,z in samples); tn=sum(y==0 and z==0 for _,_,y,_,z in samples); fp=sum(y==0 and z==1 for _,_,y,_,z in samples); fn=sum(y==1 and z==0 for _,_,y,_,z in samples)
precision=tp/max(1,tp+fp); recall=tp/max(1,tp+fn); f1=2*precision*recall/max(1e-12,precision+recall); accuracy=(tp+tn)/len(samples)
metrics=dict(accuracy=accuracy,precision=precision,recall=recall,f1=f1,tp=tp,tn=tn,fp=fp,fn=fn)
with (results/"metrics.csv").open("w",newline="",encoding="utf-8") as f:
 w=csv.writer(f); w.writerow(["metric","value"]); w.writerows(metrics.items())
run={"title":a.title,"seed":seed,"samples":len(samples),"compute":a.compute,"synthetic_data":True,"finished_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"metrics":metrics}
(results/"run.json").write_text(json.dumps(run,ensure_ascii=False,indent=2),encoding="utf-8")
summary=f"""# 实验结果报告

## 真实性声明

本次计算在远端服务器实际执行，但输入是程序生成的 1,200 条确定性合成时序样本；结果不得冒充真实训练或真实摄像头数据。

## 运行配置

- 课题：{a.title}
- seed：{seed}
- 计算设备：{a.compute}
- 样本数：{len(samples)}

## 指标

| Accuracy | Precision | Recall | F1 | TP | TN | FP | FN |
|---:|---:|---:|---:|---:|---:|---:|---:|
| {accuracy:.6f} | {precision:.6f} | {recall:.6f} | {f1:.6f} | {tp} | {tn} | {fp} | {fn} |

## 可复现性

使用 seed=23 和同一代码可复现。原始合成数据、metrics.csv 与 run.json 均已保存。
"""
algorithm="""# 实验算法细节

## 算法

生成带周期项与高斯噪声的确定性时序信号；绝对信号超过 1.05 标为异常。检测器将信号映射为 [0,1] 分数并以 0.5 阈值分类。

## GPU/CPU 选择

runner 读取 nvidia-smi；只选择显存占用小于 512 MiB 且利用率低于 10% 的第一张 GPU。没有空闲 GPU 时清空 CUDA_VISIBLE_DEVICES 并使用 CPU。

## 数据与限制

数据完全合成，适合验证 SSH、环境、GPU 调度、产物链和确定性，不证明真实模型有效。
"""
(docs/"experiment-results.md").write_text(summary,encoding="utf-8"); (docs/"algorithm-details.md").write_text(algorithm,encoding="utf-8")
print(json.dumps(run,ensure_ascii=False))

