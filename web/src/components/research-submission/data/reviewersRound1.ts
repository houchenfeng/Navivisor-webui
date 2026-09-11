export interface IReviewer {
  id: string; name: string; score: number; ratingLabel: string; trackLabel?: string;
  summary: string; strengths: string[]; weaknesses: string[]; questions: string[];
  limitations: string; confidence: number; confidenceLabel: string;
  ethicalConcerns: string; finalJustification: string;
}

export const MOCK_REVIEWERS_ROUND1: IReviewer[] = [
  {
    id: '1', name: 'Reviewer A26T', score: 3, ratingLabel: 'Borderline Reject',
    trackLabel: 'Method Novelty and Technical Depth',
    summary: 'This paper presents the GAP datasets and PuzzleFlow, a ViT-based discrete flow matching solver.',
    strengths: ['The problem formulation is authentic and under-explored.', 'The dataset documentation is unusually thorough.'],
    weaknesses: ['(major) The random interpolation path is not a valid permutation.', '(major) The training objective is plain per-piece cross-entropy.'],
    questions: ['What exactly is p_t?', 'Does the Direct Prediction variant change the training objective?'],
    limitations: 'The paper does not acknowledge non-complementary pieces or lack of rotation estimation.',
    confidence: 4, confidenceLabel: '4: Quite confident',
    ethicalConcerns: 'No particular issues.',
    finalJustification: 'The problem framing and the GAP dataset are genuinely useful, but the core technical claim is not established.',
  },
  {
    id: '2', name: 'Reviewer pF83', score: 2, ratingLabel: 'Weak Reject',
    trackLabel: 'Experimental Completeness and Reproducibility',
    summary: 'This paper introduces GAP-3 and GAP-5 and PuzzleFlow, reporting PA / AA / SRA against baselines.',
    strengths: ['The benchmark scale is meaningful.', 'The supplementary material thoroughly documents the VAE.'],
    weaknesses: ['(major) The GA baseline row is identical on GAP-3 and GAP-5.', '(major) No seeds, error bars, or significance tests.'],
    questions: ['Can GA be rerun on both datasets?', 'How many seeds were run?'],
    limitations: 'No real-fragment evaluation, no expert validation, no rotation settings.',
    confidence: 5, confidenceLabel: '5: Very confident',
    ethicalConcerns: 'No serious issues.',
    finalJustification: 'The benchmark is the strongest part, but the submitted experimental section contains an almost certainly wrong baseline row.',
  },
  {
    id: '3', name: 'Reviewer Nm41', score: 4, ratingLabel: 'Borderline Accept',
    trackLabel: 'Writing Quality and Limitations',
    summary: 'The paper is well organized: introduction, related work, GAP dataset, PuzzleFlow method, experiments, conclusions.',
    strengths: ['The narrative arc is clear.', 'Figures and captions are informative.'],
    weaknesses: ['(major) Title and abstract overclaim.', '(major) The stated limitations are not real limitations.'],
    questions: ['Will the title and abstract be revised?', 'Can the limitations section be expanded?'],
    limitations: 'Presentation is serviceable; the issue is calibration, not clarity.',
    confidence: 3, confidenceLabel: '3: Moderately confident',
    ethicalConcerns: 'Appropriate: CC0 museum images, synthetic fragments.',
    finalJustification: 'The paper is readable and contributes a benchmark, but the framing outruns the evidence.',
  },
];
