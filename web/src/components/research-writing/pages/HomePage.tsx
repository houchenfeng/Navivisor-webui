import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.98)_0_18%,rgba(235,244,255,0.92)_43%,rgba(219,234,253,0.88)_72%,rgba(206,226,250,0.9)_100%)] p-[7vw]">
      <section className="relative flex h-[min(766px,82vh)] min-h-[590px] w-[min(1208px,92vw)] flex-col overflow-hidden rounded-[28px] border border-white/90 bg-white/70 shadow-[0_30px_70px_rgba(83,130,186,0.17)] backdrop-blur">
        <div className="flex h-[75px] items-center border-b border-blue-200/40 px-[34px]">
          <div className="flex gap-[15px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-[19px] w-[19px] rounded-full bg-[#a9c7ee] shadow-inner"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center pb-5">
          <div className="mb-[88px] text-center">
            <h1 className="m-0 text-[clamp(60px,6.2vw,94px)] font-extrabold leading-none tracking-wider text-brand-700">
              写作
            </h1>
            <div className="mx-auto mt-[38px] h-[10px] w-[105px] rounded-full bg-gradient-to-r from-[#a7cdfc] to-[#79aff3]" />
          </div>

          <div className="flex w-[min(768px,82%)] gap-12">
            <Button
              variant="secondary"
              size="lg"
              className="h-[118px] flex-1 rounded-3xl text-[clamp(27px,2.6vw,42px)]"
              onClick={() => navigate({ to: "/research/paper" })}
            >
              新手科普
            </Button>
            <Button
              size="lg"
              className="h-[118px] flex-1 rounded-3xl bg-gradient-to-br from-[#71adf8] via-[#3f82eb] to-[#3778e0] text-[clamp(27px,2.6vw,42px)]"
              onClick={() => navigate({ to: "/research/paper" })}
            >
              直接开始
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
