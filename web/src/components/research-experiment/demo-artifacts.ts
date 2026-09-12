/**
 * EviVAD demo artifacts used when workspace files are not yet hydrated.
 */
import architectureDocument from '../../../../demo-packages/evivad-surveillance-demo/experiment/algorithm-details.md?raw';
import resultsDocument from '../../../../demo-packages/evivad-surveillance-demo/experiment/results.md?raw';
import planDocument from '../../../../demo-packages/evivad-surveillance-demo/experiment/plan.md?raw';

export const DEMO_ARCHITECTURE_MARKDOWN = architectureDocument;
export const DEMO_RESULTS_MARKDOWN = resultsDocument;
export const DEMO_PLAN_MARKDOWN = planDocument;

export const DEMO_COMPARISON_HEADERS = [
  'method',
  'auc',
  'ap',
  'mAP@0.5',
  'ΔAUC vs B0',
  'ΔAP vs B0',
  'EAR',
  'HR',
  'latency_ms',
] as const;

export const DEMO_COMPARISON_ROWS: string[][] = [
  ['Reconstruction-2023', '74.6', '65.1', '18.7', '-2.2', '-3.1', '—', '—', '46'],
  ['Weakly-supervised-CNN-ViT-2023', '78.3', '69.8', '23.4', '+1.5', '+1.6', '—', '—', '89'],
  ['CLIP-zero-shot-2022', '75.9', '66.5', '20.2', '-0.9', '-1.7', '—', '—', '74'],
  ['Training-free-LLM-2024', '78.9', '70.3', '24.6', '+2.1', '+2.1', '40.2', '27.8', '131'],
  ['Baseline-B0', '76.8', '68.2', '24.1', '0.0', '0.0', '41.5', '26.4', '118'],
  ['EviVAD', '82.1', '74.3', '31.6', '+5.3', '+6.1', '68.4', '9.8', '147'],
];

export const DEMO_ABLATION_HEADERS = [
  'DAA',
  'EAD',
  'DAG',
  'AUC',
  'AP',
  'EAR',
  'HR',
  'ΔAUC vs B0',
] as const;

export const DEMO_ABLATION_ROWS: string[][] = [
  ['—', '—', '—', '76.8', '68.2', '41.5', '26.4', '0.0'],
  ['✓', '—', '—', '79.4', '71.1', '43.2', '25.1', '+2.6'],
  ['—', '✓', '—', '77.9', '69.4', '63.8', '12.6', '+1.1'],
  ['—', '—', '✓', '77.6', '69.0', '43.0', '24.0', '+0.8'],
  ['✓', '✓', '—', '80.9', '72.6', '65.7', '11.2', '+4.1'],
  ['✓', '—', '✓', '80.3', '72.0', '44.6', '22.7', '+3.5'],
  ['—', '✓', '✓', '79.8', '71.4', '65.1', '10.9', '+3.0'],
  ['✓', '✓', '✓', '82.1', '74.3', '68.4', '9.8', '+5.3'],
];

export const DEMO_BIBTEX = `@article{evivad2026demo,
  title={EviVAD: Evidence-verifiable Degradation-aware Video Anomaly Detection},
  year={2026},
  note={Teaching demo package}
}
`;
