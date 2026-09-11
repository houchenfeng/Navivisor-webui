export interface INewsItem { id: string; title: string; date: string; }
export interface IVenueItem { id: string; name: string; deadline?: string; highlight?: boolean; }
export interface IPaperContent { title: string; authors: string; keywords: string; abstract: string; tldr: string; submissionNumber: string; }
export interface IMockReviewerRound2 { id: string; name: string; round1Score: number; round2Score: number; round1Comment: string; round2Comment: string; rebuttalResponse: string; }
export type IRound2Reviewer = IMockReviewerRound2;

export const MOCK_NEWS: INewsItem[] = [
  { id: '1', title: 'OpenReview Introduces Multi-Factor Authentication for All Users', date: 'Mar 23, 2026' },
  { id: '2', title: 'Survey Finds Broad Support for Greater Openness in AI Peer Review', date: 'Feb 13, 2026' },
  { id: '3', title: 'A Message from AI Research Leaders: Join Us in Supporting OpenReview', date: 'Dec 19, 2025' },
];

export const MOCK_ACTIVE_VENUES: IVenueItem[] = [
  { id: '1', name: 'TMLR' }, { id: '2', name: 'Computo' }, { id: '3', name: 'DMLR' },
  { id: '4', name: 'YouthLACIGF 2024 Edition' }, { id: '5', name: 'ISAPh 2024 Symposium' },
  { id: '6', name: 'MSLD 2024 Meeting' }, { id: '7', name: 'ICAPS 2024 Demo Track' },
  { id: '8', name: 'RAILS 2025 Conference' }, { id: '9', name: 'AIR 2024 Newsletter Round 1' },
  { id: '10', name: 'ACM SIGIR 2024 Workshop Gen-IR' }, { id: '11', name: 'HKUST 2024 AIAA5027' },
  { id: '12', name: 'MELBA' }, { id: '13', name: 'FJSS' }, { id: '14', name: 'Analytical-Connectionism' },
];

export const MOCK_OPEN_VENUES: IVenueItem[] = [
  { id: '1', name: 'CVPR 2026 Conference', deadline: 'Due 15 Nov 2026, 11:59 PM Pacific Time', highlight: true },
  { id: '2', name: 'NeurIPS 2026 Workshop MusIML', deadline: 'Due 10 Sept 2026, 04:00 AM China Standard Time' },
  { id: '3', name: 'JITA 2026 Conference', deadline: 'Due 10 Sept 2026, 07:59 China Standard Time' },
  { id: '4', name: 'IEEE IROS 2026 Workshop PWMS', deadline: 'Due 10 Sept 2026, 07:59 China Standard Time' },
  { id: '5', name: 'NeurIPS 2026 Workshop PhysWorldAI', deadline: 'Due 10 Sept 2026, 07:59 China Standard Time' },
  { id: '6', name: 'RISEx 2026 Conference', deadline: 'Due 10 Sept 2026, 08:00 China Standard Time' },
  { id: '7', name: 'NeurIPS 2026 Workshop Africa in AI', deadline: 'Due 10 Sept 2026, 08:00 China Standard Time' },
  { id: '8', name: 'NeurIPS 2026 Workshop RTCA', deadline: 'Due 10 Sept 2026, 18:59 China Standard Time' },
];

export const MOCK_ALL_VENUES: { year: string; venues: string[] }[] = [
  { year: '2021', venues: ['AAAI', 'ACL', 'CVPR', 'ICCV', 'ICML', 'IJCAI', 'NeurIPS'] },
  { year: '2024', venues: ['AAAI', 'ACL', 'CVPR', 'ECCV', 'ICASSP', 'ICCV', 'ICML', 'ICRA', 'IJCAI', 'NeurIPS', 'SIGGRAPH'] },
  { year: '2026', venues: ['3DV', 'AAAI', 'AABI', 'AACL-IJCNLP', 'AAMAS', 'ACCV', 'ACL', 'ACM', 'ACML', 'ACM MM', 'AISTATS', 'AIStats', 'CVPR', 'ECCV', 'EMNLP', 'ICASSP', 'ICC', 'ICCV', 'ICML', 'ICRA', 'IJCAI', 'NeurIPS', 'SIGGRAPH', 'WACV'] },
];

export const MOCK_PAPER_CONTENT: IPaperContent = {
  title: 'DeepPuzzle: Multi-View Consistency Gaussian Splatting for Robust Surface Reconstruction',
  authors: 'Chenfeng Hou, Qi Xun Yeo, Mengqi Guo, Yongxin Su, Yan Li, Gim Hee Lee',
  keywords: '3D Gaussian Splatting, Surface Reconstruction, Multi-View Consistency, Novel View Synthesis',
  abstract: '3D Gaussian Splatting (3DGS) has gained significant attention for its high-quality rendering capabilities, ultra-fast training, and inference speeds. However, when we apply 3DGS to surface reconstruction tasks, especially in environments with dynamic objects and distractors, the method suffers from floating artifacts and color errors due to inconsistency from different viewpoints.\n\nTo address this challenge, we propose DeepPuzzle: Multi-View Consistency Gaussian Splatting for Robust Surface Reconstruction (MVGSR), which takes advantage of lightweight Gaussian models and a heuristics-guided distractor masking strategy for robust surface reconstruction in non-static environments.',
  tldr: 'A multi-view consistency framework for robust surface reconstruction using Gaussian splatting in dynamic environments.',
  submissionNumber: '16297',
};

export const MOCK_REBUTTAL_CONTENT: string = `We sincerely thank all three reviewers for their careful, constructive, and technically precise reading of our manuscript. The reviews converge on a set of concrete improvements — statistical rigor, corrected and broadened comparisons, deeper methodological analysis, and presentational cleanup — and we treat each point as an actionable commitment for the camera-ready version. We respond below to every weakness and question raised.`;

export const MOCK_REVIEWERS_ROUND2: IMockReviewerRound2[] = [
  { id: '1', name: 'Reviewer A26T', round1Score: 3, round2Score: 4, round1Comment: 'Borderline Reject.', round2Comment: 'Raised to Borderline Accept.', rebuttalResponse: 'Added per-S sweep and schedule ablation.' },
  { id: '2', name: 'Reviewer pF83', round1Score: 2, round2Score: 3, round1Comment: 'Weak Reject.', round2Comment: 'Raised to Borderline Reject.', rebuttalResponse: 'Corrected GA baseline row.' },
  { id: '3', name: 'Reviewer Nm41', round1Score: 4, round2Score: 5, round1Comment: 'Borderline Accept.', round2Comment: 'Raised to Weak Accept.', rebuttalResponse: 'Scoped title/abstract to synthetic fragments.' },
];

export const MOCK_REVIEWERS_ACCEPTED: IMockReviewerRound2[] = [
  { id: '1', name: 'Reviewer A26T', round1Score: 5, round2Score: 6, round1Comment: 'Weak Accept.', round2Comment: 'Raised to Accept.', rebuttalResponse: 'Added inference-step sweep.' },
  { id: '2', name: 'Reviewer pF83', round1Score: 4, round2Score: 5, round1Comment: 'Borderline Accept.', round2Comment: 'Raised to Weak Accept.', rebuttalResponse: 'Corrected GA baseline.' },
  { id: '3', name: 'Reviewer Nm41', round1Score: 4, round2Score: 6, round1Comment: 'Borderline Accept.', round2Comment: 'Raised to Accept.', rebuttalResponse: 'Scoped title/abstract.' },
];

export const MOCK_ACKNOWLEDGMENTS: string = `We would like to express our deepest gratitude to all the reviewers and the Area Chair for their time, effort, and highly constructive feedback.`;
