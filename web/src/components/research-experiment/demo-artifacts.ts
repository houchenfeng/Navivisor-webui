/**
 * Shared CrackSAM demo artifacts used by experiment results + writing handoff.
 */
import architectureDocument from '../../../../docs/demo/sam-algorithm-architecture.md?raw';
import resultsDocument from '../../../../docs/demo/sam-experiment-results.md?raw';

export const DEMO_ARCHITECTURE_MARKDOWN = architectureDocument;
export const DEMO_RESULTS_MARKDOWN = resultsDocument;

export const DEMO_COMPARISON_HEADERS = [
  'Method',
  'mIoU',
  'Dice',
  'Boundary-F1',
  'Recall',
  'Latency',
] as const;

export const DEMO_COMPARISON_ROWS: string[][] = [
  ['U-Net', '65.8±0.5', '78.7±0.4', '62.4±0.7', '80.3±0.6', '18 ms'],
  ['DeepLabV3+', '67.3±0.4', '79.9±0.3', '64.8±0.6', '81.2±0.5', '27 ms'],
  ['SAM Baseline', '68.4±0.4', '80.9±0.3', '66.1±0.6', '81.8±0.5', '42 ms'],
  ['CrackSAM-MVE', '72.1±0.3', '83.8±0.2', '71.4±0.4', '85.6±0.3', '53 ms'],
];

export const DEMO_ABLATION_ROWS: string[][] = [
  ['—', '—', '—', '68.4', '80.9', '66.1', '42'],
  ['✓', '—', '—', '70.2', '82.1', '67.5', '45'],
  ['—', '✓', '—', '69.8', '81.8', '69.0', '43'],
  ['—', '—', '✓', '70.0', '81.9', '68.2', '52'],
  ['✓', '✓', '—', '71.2', '83.0', '70.2', '46'],
  ['✓', '✓', '✓', '72.1', '83.8', '71.4', '53'],
];

export const DEMO_BIBTEX = `@article{kirillov2023sam,
  title={Segment Anything},
  author={Kirillov, Alexander and others},
  journal={arXiv preprint arXiv:2304.02643},
  year={2023}
}

@inproceedings{liu2019deepcrack,
  title={DeepCrack: A Deep Hierarchical Feature Learning Architecture for Crack Segmentation},
  author={Liu, Yahui and Yao, Jian and Lu, Xiaohu and Xie, Renping and Li, Li},
  booktitle={Neurocomputing},
  year={2019}
}

@article{zou2018deepcrack,
  title={DeepCrack: Learning Hierarchical Convolutional Features for Crack Detection},
  author={Zou, Qin and Cao, Yu and Li, Qingquan and Mao, Qingzhou and Wang, Song},
  journal={IEEE TIP},
  year={2018}
}
`;