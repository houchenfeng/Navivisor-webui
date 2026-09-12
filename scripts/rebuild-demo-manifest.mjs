/**
 * Rebuild demo/demo-manifest.json (schemaVersion 3) with fresh sha256 hashes,
 * refresh writing/source-manifest.json hashes, and rebuild submission-package.zip.
 *
 * Usage (from Navivisor-webui root):
 *   node scripts/rebuild-demo-manifest.mjs
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const root = join(repoRoot, 'demo-packages', 'camera-vad-scene-memory');

async function sha256File(rel) {
  const buf = await readFile(join(root, rel));
  return createHash('sha256').update(buf).digest('hex');
}

function file(key, path, role, mediaType, extra = {}) {
  return { key, path, role, mediaType, ...extra };
}

async function withHash(desc) {
  const sha256 = await sha256File(desc.path);
  return { ...desc, sha256, required: desc.required !== false };
}

async function main() {
  const nodes = [
    {
      key: 'intake',
      stage: 'topic.intake',
      inputs: [],
      files: [
        file('intake-json', 'topic/intake.json', 'project-intake', 'application/json'),
      ],
    },
    {
      key: 'first-search',
      stage: 'topic.first-search',
      inputs: ['intake-json'],
      files: [
        file('search-strategy', 'topic/search-strategy.json', 'search-strategy', 'application/json'),
        file('search-iterations', 'topic/search-iterations.jsonl', 'search-iterations', 'application/x-ndjson'),
        file('papers-csv', 'topic/candidate-papers.csv', 'candidate-papers', 'text/csv'),
        file('screening-csv', 'topic/screening.csv', 'screening-log', 'text/csv'),
      ],
    },
    {
      key: 'candidates',
      stage: 'topic.candidates',
      inputs: ['papers-csv', 'screening-csv'],
      files: [
        file('landscape', 'topic/landscape.md', 'topic-landscape', 'text/markdown'),
        file('candidate-topics', 'topic/candidate-topics.json', 'candidate-topics', 'application/json'),
        file('candidate-topics-md', 'topic/candidate-topics.md', 'candidate-topics', 'text/markdown'),
      ],
    },
    {
      key: 'confirmation',
      stage: 'topic.confirmation',
      inputs: ['candidate-topics'],
      files: [
        file('confirmed-topic', 'topic/confirmed-topic.json', 'confirmed-topic', 'application/json'),
      ],
    },
    {
      key: 'core-literature',
      stage: 'topic.core-literature',
      inputs: ['confirmed-topic'],
      files: [
        file('core-references', 'topic/core-references.csv', 'core-references', 'text/csv'),
        file('literature-bib', 'topic/references.bib', 'literature-bib', 'application/x-bibtex'),
        file('paper-manifest', 'topic/paper-manifest.json', 'paper-manifest', 'application/json'),
        file('literature-handoff', 'topic/literature-handoff.md', 'literature-handoff', 'text/markdown'),
        file('demo-paper-001', 'topic/papers/DEMO-001.pdf', 'diagnostics', 'application/pdf'),
        file('demo-paper-002', 'topic/papers/DEMO-002.pdf', 'diagnostics', 'application/pdf'),
        file('demo-paper-003', 'topic/papers/DEMO-003.pdf', 'diagnostics', 'application/pdf'),
      ],
    },
    {
      key: 'experiment-plan',
      stage: 'experiment.plan',
      inputs: ['confirmed-topic', 'literature-handoff'],
      files: [
        file('experiment-plan', 'experiment/plan.md', 'experiment-plan', 'text/markdown'),
        file('experiment-config', 'experiment/config.json', 'experiment-config', 'application/json'),
        file('dataset-manifest', 'experiment/dataset-manifest.json', 'dataset-manifest', 'application/json'),
        file('innovations-json', 'experiment/innovations.json', 'experiment-plan', 'application/json'),
      ],
    },
    {
      key: 'experiment-run',
      stage: 'experiment.run',
      inputs: [
        'experiment-plan',
        'experiment-config',
        'innovations-json',
        'algorithm-details',
      ],
      files: [
        file('results-md', 'experiment/results.md', 'experiment-results', 'text/markdown'),
        file('algorithm-details', 'experiment/algorithm-details.md', 'method-architecture', 'text/markdown'),
        file('pipeline-py', 'experiment/code/pipeline.py', 'method-architecture', 'text/x-python'),
        file('metrics-main', 'experiment/metrics/main.csv', 'experiment-results', 'text/csv'),
        file('metrics-ablation', 'experiment/metrics/ablation.csv', 'experiment-results', 'text/csv'),
        file('metrics-seeds', 'experiment/metrics/seeds.csv', 'experiment-results', 'text/csv'),
        file('comparison-png', 'experiment/figures/comparison.png', 'paper-figure', 'image/png'),
        file('architecture-png', 'experiment/figures/architecture.png', 'paper-figure', 'image/png'),
        file('figure-generation', 'experiment/figures/generation.json', 'diagnostics', 'application/json'),
      ],
    },
    {
      key: 'writing-outline',
      stage: 'writing.outline',
      inputs: ['confirmed-topic', 'results-md', 'metrics-main', 'architecture-png', 'comparison-png'],
      files: [
        file('outline', 'writing/outline.md', 'paper-outline', 'text/markdown'),
      ],
    },
    {
      key: 'writing-draft',
      stage: 'writing.draft',
      inputs: [
        'outline',
        'core-references',
        'algorithm-details',
        'metrics-main',
        'results-md',
        'architecture-png',
        'comparison-png',
      ],
      files: [
        file('paper-tex', 'writing/paper.tex', 'paper-source', 'application/x-tex'),
        file('paper-metadata', 'writing/paper-metadata.json', 'paper-metadata', 'application/json'),
        file('writing-references-bib', 'writing/references.bib', 'paper-source', 'application/x-bibtex'),
        file('section-abstract', 'writing/sections/abstract.md', 'paper-source', 'text/markdown'),
        file('section-introduction', 'writing/sections/introduction.md', 'paper-source', 'text/markdown'),
        file('section-related', 'writing/sections/related.md', 'paper-source', 'text/markdown'),
        file('section-method', 'writing/sections/method.md', 'paper-source', 'text/markdown'),
        file('section-experiments', 'writing/sections/experiments.md', 'paper-source', 'text/markdown'),
        file('section-conclusion', 'writing/sections/conclusion.md', 'paper-source', 'text/markdown'),
        file('writing-architecture-png', 'writing/figures/architecture.png', 'paper-figure', 'image/png'),
        file('writing-comparison-png', 'writing/figures/comparison.png', 'paper-figure', 'image/png'),
        file('source-manifest', 'writing/source-manifest.json', 'paper-metadata', 'application/json'),
      ],
    },
    {
      key: 'writing-final',
      stage: 'writing.final',
      inputs: ['paper-tex', 'writing-references-bib', 'writing-architecture-png', 'writing-comparison-png'],
      files: [
        file('paper-pdf', 'writing/paper.pdf', 'paper-pdf', 'application/pdf'),
        file('compile-log', 'writing/compile-log.txt', 'diagnostics', 'text/plain'),
      ],
    },
    {
      key: 'submission-prepare',
      stage: 'submission.prepare',
      inputs: ['paper-pdf', 'paper-tex', 'paper-metadata'],
      files: [
        file('venue', 'submission/venue.json', 'venue-requirements', 'application/json'),
        file('checklist', 'submission/checklist.json', 'venue-requirements', 'application/json'),
        file('package', 'submission/submission-package.zip', 'submission-package', 'application/zip'),
      ],
    },
    {
      key: 'review-round1',
      stage: 'submission.review.round1',
      inputs: ['package'],
      files: [
        file('reviews', 'submission/reviews.json', 'review-round1', 'application/json'),
        file('reviews-md', 'submission/reviews.md', 'review-round1', 'text/markdown'),
      ],
    },
    {
      key: 'rebuttal',
      stage: 'submission.rebuttal',
      inputs: ['reviews', 'reviews-md'],
      files: [
        file('rebuttal-md', 'submission/rebuttal.md', 'rebuttal', 'text/markdown'),
        file('response-map', 'submission/response-map.json', 'rebuttal', 'application/json'),
      ],
    },
    {
      key: 'decision',
      stage: 'submission.decision',
      inputs: ['rebuttal-md', 'response-map'],
      files: [
        file('decision', 'submission/decision.json', 'submission-decision', 'application/json'),
      ],
    },
  ];

  // Fix forward refs: experiment-run inputs should not require algorithm-details before it's an output of same node.
  // Use plan outputs only for run inputs (as original).
  nodes.find((n) => n.key === 'experiment-run').inputs = [
    'experiment-plan',
    'experiment-config',
    'innovations-json',
  ];

  // First pass hashes for all files except zip (rebuilt below) and source-manifest (updated below)
  const hashCache = new Map();
  async function hash(rel) {
    if (!hashCache.has(rel)) hashCache.set(rel, await sha256File(rel));
    return hashCache.get(rel);
  }

  // Update source-manifest with real hashes
  const sourceManifestPath = join(root, 'writing', 'source-manifest.json');
  const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'));
  for (const section of Object.values(sourceManifest.sections)) {
    for (const input of section.inputs) {
      input.sha256 = await hash(input.path);
    }
  }
  for (const fig of sourceManifest.figures) {
    fig.sha256 = await hash(fig.path);
  }
  sourceManifest.bibliography.sha256 = await hash(sourceManifest.bibliography.path);
  await writeFile(sourceManifestPath, JSON.stringify(sourceManifest, null, 2) + '\n', 'utf8');
  hashCache.delete('writing/source-manifest.json');

  // Rebuild submission zip from writing outputs (preserve relative paths).
  const staging = join(root, 'submission', '_zip_staging');
  await rm(staging, { recursive: true, force: true });
  const zipMembers = [
    'writing/paper.pdf',
    'writing/paper.tex',
    'writing/paper-metadata.json',
    'writing/references.bib',
    'writing/compile-log.txt',
    'writing/figures/architecture.png',
    'writing/figures/comparison.png',
    'writing/outline.md',
    'writing/source-manifest.json',
    'submission/venue.json',
    'submission/checklist.json',
  ];
  for (const rel of zipMembers) {
    const dest = join(staging, rel);
    await mkdir(dirname(dest), { recursive: true });
    await cp(join(root, rel), dest);
  }
  const zipPath = join(root, 'submission', 'submission-package.zip');
  const ps = `
$ErrorActionPreference = 'Stop'
$staging = '${staging.replace(/'/g, "''")}'
$zip = '${zipPath.replace(/'/g, "''")}'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zip -Force
`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], {
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    throw new Error('Failed to build submission-package.zip');
  }
  await rm(staging, { recursive: true, force: true });
  hashCache.delete('submission/submission-package.zip');
  // Build hashed nodes
  const hashedNodes = [];
  for (const node of nodes) {
    const files = [];
    for (const f of node.files) {
      const sha256 = await hash(f.path);
      const entry = {
        key: f.key,
        path: f.path,
        role: f.role,
        mediaType: f.mediaType,
        required: true,
        sha256,
      };
      files.push(entry);
    }
    hashedNodes.push({
      key: node.key,
      stage: node.stage,
      inputs: node.inputs,
      files,
    });
  }

  const manifest = {
    schemaVersion: 3,
    demoId: 'camera-vad-scene-memory',
    version: '1.1.0',
    simulated: true,
    nodes: hashedNodes,
    missing: [
      {
        path: 'writing/template/cvpr.sty',
        reason: 'no_legal_redistributable_cvpr_sty_bundled',
        requiredBy: ['writing-final', 'submission-prepare'],
        optional: false,
      },
      {
        path: 'writing/paper.pdf',
        reason: 'pdflatex_unavailable_or_cvpr_sty_missing; multi-page SIMULATED DEMO COMPILED SUBSTITUTE PDF present',
        requiredBy: ['writing-final', 'submission-prepare'],
        optional: false,
      },
    ],
  };

  const outPath = join(root, 'demo', 'demo-manifest.json');
  await writeFile(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const fileCount = hashedNodes.reduce((n, node) => n + node.files.length, 0);
  console.log(
    JSON.stringify(
      {
        ok: true,
        schemaVersion: 3,
        version: '1.1.0',
        nodes: hashedNodes.length,
        files: fileCount,
        zipSha256: await hash('submission/submission-package.zip'),
        paperPdfSha256: await hash('writing/paper.pdf'),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
