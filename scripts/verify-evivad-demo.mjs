import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(
  resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  'demo-packages',
  'evivad-surveillance-demo',
);
const manifest = JSON.parse(
  await readFile(join(root, 'demo', 'demo-manifest.json'), 'utf8'),
);
const allowedStages = new Set([
  'topic.intake',
  'topic.first-search',
  'topic.candidates',
  'topic.confirmation',
  'topic.core-literature',
  'experiment.plan',
  'experiment.run',
  'writing.outline',
  'writing.draft',
  'writing.final',
  'submission.prepare',
  'submission.review.round1',
  'submission.rebuttal',
  'submission.decision',
]);
const allowedRoles = new Set([
  'project-intake',
  'search-strategy',
  'search-iterations',
  'candidate-papers',
  'screening-log',
  'topic-landscape',
  'candidate-topics',
  'confirmed-topic',
  'core-references',
  'literature-bib',
  'paper-manifest',
  'literature-handoff',
  'experiment-plan',
  'experiment-results',
  'method-architecture',
  'paper-outline',
  'paper-metadata',
  'paper-source',
  'paper-pdf',
  'paper-figure',
  'paper-translation',
  'dataset-manifest',
  'experiment-config',
  'venue-requirements',
  'submission-package',
  'review-round1',
  'rebuttal',
  'submission-decision',
  'diagnostics',
  'workspace-index',
  'demo-manifest',
]);
allowedRoles.add('literature-pdf');
const csvContracts = {
  'topic/candidate-papers.csv': [
    'paper_id',
    'title',
    'authors',
    'venue',
    'year',
    'doi',
    'abstract',
    'citation_count',
    'source',
    'source_url',
    'synthetic',
  ],
  'topic/core-references.csv': [
    'paper_id',
    'title',
    'authors',
    'venue',
    'year',
    'doi',
    'abstract',
    'citation_count',
    'source',
    'source_url',
    'synthetic',
    'citation_key',
    'relevance_reason',
    'method_relation',
    'publication_date',
    'fulltext_status',
    'pdf_artifact_ref',
    'verified',
  ],
  'experiment/metrics/main.csv': [
    'method',
    'auc_percent',
    'ap_percent',
    'map_at_0_5_percent',
    'auc_delta_vs_b0',
    'ap_delta_vs_b0',
    'ear_percent',
    'hr_percent',
    'latency_ms',
    'memory_gb',
    'simulated',
  ],
  'experiment/metrics/ablation.csv': [
    'daa',
    'ead',
    'dag',
    'auc_percent',
    'ap_percent',
    'map_at_0_5_percent',
    'ear_percent',
    'cfs_percent',
    'hr_percent',
    'tcr_percent',
    'auc_delta_vs_b0',
    'trainable_params_m',
    'latency_ms',
    'simulated',
  ],
  'experiment/metrics/robustness.csv': [
    'degradation',
    'severity',
    'baseline_auc_percent',
    'dag_auc_percent',
    'baseline_hr_percent',
    'dag_hr_percent',
    'simulated',
  ],
};
let pass = 0;
const failures = [];
function check(condition, label) {
  if (condition) pass += 1;
  else failures.push(label);
}
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const safePath = (path) =>
  !/^(?:[a-z]:[\\/]|[\\/]{1,2})/i.test(path) &&
  !path.split(/[\\/]/).includes('..');

check(manifest.schemaVersion === 3, 'manifest schemaVersion must be 3');
check(manifest.demoId === 'evivad-surveillance-demo', 'unexpected demoId');
check(manifest.simulated === true, 'manifest must remain simulated');
const fileKeys = new Set();
const nodeKeys = new Set();
const allFiles = [];
for (const node of manifest.nodes) {
  check(!nodeKeys.has(node.key), `duplicate node key ${node.key}`);
  nodeKeys.add(node.key);
  check(allowedStages.has(node.stage), `invalid stage ${node.stage}`);
  for (const file of node.files) {
    check(!fileKeys.has(file.key), `duplicate file key ${file.key}`);
    fileKeys.add(file.key);
    check(allowedRoles.has(file.role), `invalid role ${file.role}`);
    check(safePath(file.path), `unsafe path ${file.path}`);
    check(/^[a-f0-9]{64}$/.test(file.sha256), `invalid sha256 ${file.path}`);
    check(
      typeof file.required === 'boolean',
      `required missing for ${file.path}`,
    );
    allFiles.push(file);
  }
}
for (const node of manifest.nodes)
  for (const input of node.inputs)
    check(fileKeys.has(input), `unknown input ${input}`);

const producer = new Map();
for (const node of manifest.nodes)
  for (const file of node.files) producer.set(file.key, node.key);
const edges = new Map(
  manifest.nodes.map((node) => [
    node.key,
    new Set(node.inputs.map((input) => producer.get(input)).filter(Boolean)),
  ]),
);
const visiting = new Set();
const visited = new Set();
function visit(key) {
  if (visiting.has(key)) return false;
  if (visited.has(key)) return true;
  visiting.add(key);
  for (const dependency of edges.get(key) ?? [])
    if (!visit(dependency)) return false;
  visiting.delete(key);
  visited.add(key);
  return true;
}
check([...nodeKeys].every(visit), 'dependency cycle detected');

for (const file of allFiles) {
  const absolute = join(root, ...file.path.split('/'));
  let bytes;
  try {
    bytes = await readFile(absolute);
  } catch {
    failures.push(`missing manifest file ${file.path}`);
    continue;
  }
  check(digest(bytes) === file.sha256, `hash mismatch ${file.path}`);
  if (file.mediaType === 'application/pdf')
    check(
      bytes.subarray(0, 5).toString() === '%PDF-',
      `PDF signature mismatch ${file.path}`,
    );
  if (file.mediaType === 'image/png')
    check(
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      `PNG signature mismatch ${file.path}`,
    );
  if (file.mediaType === 'application/zip') {
    check(
      bytes[0] === 0x50 && bytes[1] === 0x4b,
      `ZIP signature mismatch ${file.path}`,
    );
    try {
      const listing = execFileSync('tar', ['-tf', absolute], {
        encoding: 'utf8',
      });
      check(listing.trim().length > 0, `empty ZIP ${file.path}`);
      check(
        !listing
          .split(/\r?\n/)
          .some((entry) => entry.split(/[\\/]/).includes('..')),
        `unsafe ZIP member ${file.path}`,
      );
    } catch {
      failures.push(`unreadable ZIP ${file.path}`);
    }
  }
  if (file.mediaType === 'application/json')
    try {
      JSON.parse(bytes.toString('utf8'));
    } catch {
      failures.push(`invalid JSON ${file.path}`);
    }
  if (file.mediaType === 'application/x-ndjson')
    for (const [index, line] of bytes
      .toString('utf8')
      .trim()
      .split(/\r?\n/)
      .entries())
      try {
        JSON.parse(line);
      } catch {
        failures.push(`invalid JSONL ${file.path}:${index + 1}`);
      }
}

for (const [path, columns] of Object.entries(csvContracts)) {
  const header = (await readFile(join(root, ...path.split('/')), 'utf8'))
    .split(/\r?\n/, 1)[0]
    .replace(/^\uFEFF/, '')
    .split(',');
  check(
    columns.every((column, index) => header[index] === column),
    `CSV contract mismatch ${path}`,
  );
}
const paperManifest = JSON.parse(
  await readFile(join(root, 'topic', 'paper-manifest.json'), 'utf8'),
);
const audit = JSON.parse(
  await readFile(join(root, 'topic', 'paper-mapping-audit.json'), 'utf8'),
);
check(
  paperManifest.papers.length === 32 && audit.papers.length === 32,
  'paper manifest/audit must each contain 32 records',
);
check(
  new Set(paperManifest.papers.map((paper) => paper.paperId)).size === 32,
  'paper IDs are not unique',
);
check(
  new Set(paperManifest.papers.map((paper) => paper.citationKey)).size === 32,
  'citation keys are not unique',
);
check(
  paperManifest.papers.every(
    (paper) =>
      paper.path &&
      /^[a-f0-9]{64}$/.test(paper.sha256) &&
      paper.verified === true,
  ),
  'paper manifest mapping is inconsistent',
);
const missingPdfs = manifest.missing.filter(
  (item) => item.path.startsWith('topic/papers/') && item.path.endsWith('.pdf'),
);
check(missingPdfs.length === 1, 'manifest must declare the one over-limit PDF');
const paperDir = join(root, 'topic', 'papers');
let bundledPdfs = [];
try {
  bundledPdfs = (await readdir(paperDir)).filter(
    (name) => extname(name).toLowerCase() === '.pdf',
  );
} catch {}
check(
  bundledPdfs.length === 32,
  'all 32 verified literature PDFs must be bundled',
);

const projectText = await readFile(join(root, 'project.json'), 'utf8');
const manifestText = await readFile(
  join(root, 'demo', 'demo-manifest.json'),
  'utf8',
);
check(
  !/[A-Z]:\\Users\\/i.test(projectText + manifestText),
  'absolute developer path leaked into package metadata',
);
const metricFiles = ['main.csv', 'ablation.csv', 'robustness.csv'];
for (const name of metricFiles) {
  const rows = (
    await readFile(join(root, 'experiment', 'metrics', name), 'utf8')
  )
    .trim()
    .split(/\r?\n/)
    .slice(1);
  check(
    rows.every((row) => row.endsWith(',true')),
    `${name} contains non-simulated rows`,
  );
}

console.log(
  JSON.stringify(
    {
      root,
      manifestFiles: allFiles.length,
      pass,
      fail: failures.length,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
