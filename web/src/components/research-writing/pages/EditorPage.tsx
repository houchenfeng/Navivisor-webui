import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { STEPS, type WritingData } from "@/components/research-writing/data/writingSteps";
import { loadData, saveData } from "@/components/research-writing/lib/storage";
import { fillWritingFromExperiment } from "@/components/research-writing/lib/fillFromExperiment";
import { useResearchProjectStore } from "@/stores/research-project-store";
import { cn } from "@/lib/utils";

import Step1Upload from "@/components/research-writing/components/writing/Step1Upload";
import Step2TitleAbstract from "@/components/research-writing/components/writing/Step2TitleAbstract";
import Step3To8Text from "@/components/research-writing/components/writing/Step3To8Text";
import Step5Algorithm from "@/components/research-writing/components/writing/Step5Algorithm";
import Step6Experiment from "@/components/research-writing/components/writing/Step6Experiment";
import Step8References from "@/components/research-writing/components/writing/Step8References";
import Step9Preview from "@/components/research-writing/components/writing/Step9Preview";
import Step9Export from "@/components/research-writing/components/writing/Step9Export";

export default function EditorPage() {
  const navigate = useNavigate();
  const projectId = useResearchProjectStore((state) => state.project?.projectId ?? null);
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WritingData>(() => loadData(projectId));

  useEffect(() => {
    let cancelled = false;
    const saved = loadData(projectId);
    const syncSaved = window.setTimeout(() => {
      if (!cancelled) setData(saved);
    }, 0);
    const hasSavedDraft = [saved.topic, saved.experimentDetail, saved.experimentResult, saved.bibContent]
      .some((value) => (value ?? "").trim().length > 0);
    if (projectId && !hasSavedDraft) {
      void fillWritingFromExperiment().then((result) => {
        if (!cancelled) setData((current) => ({ ...current, ...result.patch }));
      });
    }
    return () => {
      cancelled = true;
      window.clearTimeout(syncSaved);
    };
  }, [projectId]);

  useEffect(() => {
    saveData(data, projectId);
  }, [data, projectId]);

  const handleChange = (patch: Partial<WritingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const currentStep = STEPS[stepIndex];

  const hasMaterials = [data.topic, data.experimentDetail, data.experimentResult, data.bibContent]
    .some((value) => (value ?? "").trim().length > 0);

  const goPrev = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  };

  return (
    <main className="navivisor-module flex min-h-0 flex-1 flex-col overflow-x-hidden p-4">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-lg backdrop-blur">
        <header className="flex items-center gap-4 border-b border-blue-100 bg-white/70 px-6 py-3">
          <Button
            variant="secondary"
            className="h-8 shrink-0 px-3 text-xs"
            onClick={() => navigate({ to: "/research/home" })}
          >
            ← 返回首页
          </Button>
          <span className="text-sm font-bold text-brand-700">
            写作 · Writing
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            已自动保存
          </span>
        </header>

        {/* 步骤条：可任意跳转 */}
        <div className="flex items-center gap-1 border-b border-blue-100 bg-white/60 px-6 py-3">
          {STEPS.map((s, idx) => {
            const isDone = idx < stepIndex;
            const isActive = idx === stepIndex;
            return (
              <div key={s.key} className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStepIndex(idx)}
                  className="flex cursor-pointer items-center gap-2 transition-all"
                  title={s.zh}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all",
                      isActive
                        ? "bg-brand-500 text-white shadow-md"
                        : isDone
                        ? "bg-brand-100 text-brand-500 hover:bg-brand-200"
                        : "bg-slate-100 text-slate-500 hover:bg-brand-100 hover:text-brand-500"
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden whitespace-nowrap text-xs transition-all xl:inline",
                      isActive
                        ? "font-semibold text-brand-700"
                        : "text-ink-sub"
                    )}
                  >
                    {s.zh}
                  </span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-[2px] flex-1 rounded",
                      idx < stepIndex ? "bg-brand-300" : "bg-slate-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 内容区 */}
        <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-8">
          <div className="mx-auto flex w-full max-w-[1100px] min-h-0 flex-1 flex-col gap-4">
            {currentStep.key !== "upload" && !hasMaterials ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                暂未选择素材。可先返回「上传素材」填写课题或点击「填入实验素材」，也可继续浏览后续步骤。
                <button
                  type="button"
                  onClick={() => setStepIndex(0)}
                  className="ml-2 font-semibold text-brand-500 underline-offset-2 hover:underline"
                >
                  去上传素材
                </button>
              </div>
            ) : null}

            {currentStep.key === "upload" && (
              <Step1Upload data={data} onChange={handleChange} />
            )}
            {currentStep.key === "title-abstract" && (
              <Step2TitleAbstract data={data} onChange={handleChange} />
            )}
            {currentStep.key === "intro" && (
              <Step3To8Text
                data={data}
                onChange={handleChange}
                field="intro"
                title="引言"
                hint="介绍研究背景、动机、问题定义和本文主要贡献。建议 600~1000 词。"
                placeholder="在这里撰写引言..."
              />
            )}
            {currentStep.key === "related" && (
              <Step3To8Text
                data={data}
                onChange={handleChange}
                field="related"
                title="相关工作"
                hint="梳理与本文最相关的研究，指出它们的不足与本文的区别。"
                placeholder="在这里撰写相关工作..."
              />
            )}
            {currentStep.key === "algorithm" && (
              <Step5Algorithm data={data} onChange={handleChange} />
            )}
            {currentStep.key === "experiment" && (
              <Step6Experiment data={data} onChange={handleChange} />
            )}
            {currentStep.key === "discussion" && (
              <Step3To8Text
                data={data}
                onChange={handleChange}
                field="discussion"
                title="讨论和展望"
                hint="讨论方法的意义、局限，以及未来可能的研究方向。"
                placeholder="在这里撰写讨论和展望..."
              />
            )}
            {currentStep.key === "references" && (
              <Step8References data={data} onChange={handleChange} />
            )}
            {currentStep.key === "preview" && (
              <Step9Preview data={data} onChange={handleChange} />
            )}
            {currentStep.key === "export" && <Step9Export data={data} />}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-blue-100 bg-white/70 px-6 py-3">
          <div className="text-xs text-ink-sub">
            第 <b className="text-brand-700">{stepIndex + 1}</b> / {STEPS.length}{" "}
            步 · <b className="text-brand-700">{currentStep.zh}</b>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="h-9 px-5 text-sm"
              onClick={goPrev}
              disabled={stepIndex === 0}
            >
              ← 上一步
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button className="h-9 px-5 text-sm" onClick={goNext}>
                下一步 →
              </Button>
            ) : (
              <Button
                className="h-9 px-5 text-sm"
                onClick={() => void navigate({ to: "/research/submit" })}
              >
                进入投稿模块 →
              </Button>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}
