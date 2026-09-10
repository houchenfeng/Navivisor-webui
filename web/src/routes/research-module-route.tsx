interface ResearchModuleRouteProps {
  moduleName: string;
}

/** Placeholder page for the four stages of the Navivisor research workflow. */
export function ResearchModuleRoute({ moduleName }: ResearchModuleRouteProps) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center p-6">
      <p className="text-center text-lg font-medium text-foreground">
        Navivisor · 研途启航 科研智能体 {moduleName} 模块即将开放。
      </p>
    </main>
  );
}
