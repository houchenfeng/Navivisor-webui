import { I18nProvider } from './context/I18nContext';
import { SimulationProvider } from './context/SimulationContext';
import SimulationPage from './pages/SimulationPage/SimulationPage';

/**
 * CVPR 论文投稿全流程仿真模块
 * 6步流程：首页 → 会议页 → 投稿 → 初审 → Rebuttal → 最终结果
 */
export function SubmissionPage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <I18nProvider>
        <SimulationProvider>
          <SimulationPage />
        </SimulationProvider>
      </I18nProvider>
    </div>
  );
}
