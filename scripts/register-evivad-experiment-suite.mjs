import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'demo-packages', 'evivad-surveillance-demo');
const manifestPath = join(root, 'demo', 'demo-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const sha256 = async (path) =>
  createHash('sha256').update(await readFile(join(root, path))).digest('hex');

const plans = [
  'experiment/plans/README.md',
  'experiment/plans/01_baseline-reproduction.md',
  'experiment/plans/02_daa-domain-adaptation.md',
  'experiment/plans/03_ead-evidence-grounding.md',
  'experiment/plans/04_dag-degradation-gating.md',
  'experiment/plans/05_full-factorial-ablation.md',
  'experiment/plans/06_cross-domain-generalization.md',
  'experiment/plans/07_efficiency-deployment.md',
  'experiment/plans/08_failure-cases-and-safety.md',
  'experiment/experiment-suite.json',
  'experiment/figures/generated-assets-v2.json',
];
const results = [
  'experiment/results-data/01_baseline.csv',
  'experiment/results-data/02_daa.csv',
  'experiment/results-data/03_ead.csv',
  'experiment/results-data/04_dag.csv',
  'experiment/results-data/05_ablation.csv',
  'experiment/results-data/06_cross-domain.csv',
  'experiment/results-data/07_efficiency.csv',
  'experiment/results-data/08_failure-cases.csv',
];
const figures = [
  'experiment/figures/framework-generated-v2.png',
  'experiment/figures/qualitative-generated-v2.png',
];

const planNode = manifest.nodes.find((node) => node.key === 'experiment-plan');
const runNode = manifest.nodes.find((node) => node.key === 'experiment-run');
if (!planNode || !runNode) throw new Error('Experiment manifest nodes not found');

const removeSuite = (files) =>
  files.filter((file) => !String(file.key).startsWith('experiment-suite-'));
planNode.files = removeSuite(planNode.files);
runNode.files = removeSuite(runNode.files);

for (const [index, path] of plans.entries()) {
  planNode.files.push({
    key: `experiment-suite-plan-${String(index).padStart(2, '0')}`,
    path,
    role: 'experiment-plan',
    mediaType: path.endsWith('.json') ? 'application/json' : 'text/markdown',
    required: false,
    sha256: await sha256(path),
  });
}
for (const [index, path] of results.entries()) {
  runNode.files.push({
    key: `experiment-suite-result-${String(index + 1).padStart(2, '0')}`,
    path,
    role: 'experiment-results',
    mediaType: 'text/csv',
    required: false,
    sha256: await sha256(path),
  });
}
for (const [index, path] of figures.entries()) {
  runNode.files.push({
    key: `experiment-suite-figure-${String(index + 1).padStart(2, '0')}`,
    path,
    role: 'paper-figure',
    mediaType: 'image/png',
    required: false,
    sha256: await sha256(path),
  });
}

for (const node of manifest.nodes) {
  for (const file of node.files) {
    try {
      file.sha256 = await sha256(file.path);
    } catch {
      // Missing files remain represented by the manifest's missing declarations.
    }
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Registered ${plans.length + results.length + figures.length} suite artifacts.`);
