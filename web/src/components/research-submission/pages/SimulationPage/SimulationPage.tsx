import { useSimulation } from '../../context/SimulationContext';
import Header from '../../components/Header';
import ProgressBar from '../../components/ProgressBar';
import Step1OpenReviewHome from '../../components/steps/Step1OpenReviewHome';
import Step2VenuePage from '../../components/steps/Step2VenuePage';
import Step3SubmissionForm from '../../components/steps/Step3SubmissionForm';
import Step4FirstRoundResult from '../../components/steps/Step4FirstRoundResult';
import Step5Rebuttal from '../../components/steps/Step5Rebuttal';
import Step6FinalResult from '../../components/steps/Step6FinalResult';

export default function SimulationPage() {
  const { step } = useSimulation();
  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1OpenReviewHome />;
      case 2:
        return <Step2VenuePage />;
      case 3:
        return <Step3SubmissionForm />;
      case 4:
        return <Step4FirstRoundResult />;
      case 5:
        return <Step5Rebuttal />;
      case 6:
        return <Step6FinalResult />;
      default:
        return <Step1OpenReviewHome />;
    }
  };
  return (
    <div className="min-h-full bg-[#fdfcf7]">
      <Header />
      <ProgressBar />
      <main>{renderStep()}</main>
    </div>
  );
}
