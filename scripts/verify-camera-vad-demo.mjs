/**
 * Verify camera-vad-scene-memory demo package integrity.
 * Usage: node scripts/verify-camera-vad-demo.mjs
 */
import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'demo-packages', 'camera-vad-scene-memory');
const errors = [];
const ok = [];

function fail(msg) {
  errors.push(msg);
}
function pass(msg) {
  ok.push(msg);
}

async function sha256(rel) {
  const buf = await readFile(join(root, rel));
  return createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const manifest = JSON.parse(await readFile(join(root, 'demo', 'demo-manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 3) fail(`schemaVersion expected 3, got ${manifest.schemaVersion}`);
  else pass('schemaVersion=3');
  if (manifest.version !== '1.1.0') fail(`demo version expected 1.1.0, got ${manifest.version}`);
  else pass('demo.version=1.1.0');

  const project = JSON.parse(await readFile(join(root, 'project.json'), 'utf8'));
  if (project.demo?.version !== '1.1.0') fail(`project.json demo.version expected 1.1.0`);
  else pass('project.json demo.version=1.1.0');

  // Load every JSON / JSONL
  const jsonFiles = [];
  for (const node of manifest.nodes) {
    for (const f of node.files) {
      if (f.mediaType === 'application/json' || f.path.endsWith('.json')) jsonFiles.push(f.path);
      if (f.mediaType === 'application/x-ndjson' || f.path.endsWith('.jsonl')) {
        const text = await readFile(join(root, f.path), 'utf8');
        for (const line of text.split(/\r?\n/).filter(Boolean)) {
          try {
            JSON.parse(line);
          } catch {
            fail(`JSONL parse failed: ${f.path}`);
          }
        }
        pass(`JSONL ok: ${f.path}`);
      }
    }
  }
  // Also project.json
  jsonFiles.push('project.json');
  for (const p of [...new Set(jsonFiles)]) {
    try {
      JSON.parse(await readFile(join(root, p), 'utf8'));
      pass(`JSON ok: ${p}`);
    } catch (e) {
      fail(`JSON parse failed: ${p}: ${e.message}`);
    }
  }

  // CSV headers
  const csvSpecs = {
    'experiment/metrics/main.csv': 'dataset,method,auroc_percent,ap_percent,f1_percent,vlm_call_percent,mean_latency_ms,simulated',
    'experiment/metrics/ablation.csv': 'variant,I1,I2,I3,auroc_percent,ap_percent,mean_latency_ms,simulated',
    'experiment/metrics/seeds.csv': 'dataset,method,seed,auroc_percent,ap_percent,f1_percent,simulated',
    'topic/candidate-papers.csv': 'paper_id,title,authors,venue,year,doi,abstract,citation_count,source,source_url,synthetic',
    'topic/screening.csv': 'paper_id,decision,relevance_score,reason,evidence,reviewer,synthetic',
  };
  for (const [rel, header] of Object.entries(csvSpecs)) {
    const first = (await readFile(join(root, rel), 'utf8')).split(/\r?\n/)[0].trim();
    if (first !== header) fail(`CSV header mismatch ${rel}: got ${first}`);
    else pass(`CSV header ok: ${rel}`);
  }

  // PNG magic
  for (const rel of [
    'experiment/figures/architecture.png',
    'experiment/figures/comparison.png',
    'writing/figures/architecture.png',
    'writing/figures/comparison.png',
  ]) {
    const buf = await readFile(join(root, rel));
    const magic = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (!magic) fail(`PNG magic bad: ${rel}`);
    else if (buf.length < 1000) fail(`PNG too small (placeholder?): ${rel} size=${buf.length}`);
    else pass(`PNG ok: ${rel} (${buf.length} bytes)`);
  }

  // PDF starts with %PDF
  for (const rel of [
    'writing/paper.pdf',
    'topic/papers/DEMO-001.pdf',
    'topic/papers/DEMO-002.pdf',
    'topic/papers/DEMO-003.pdf',
  ]) {
    const buf = await readFile(join(root, rel));
    if (!buf.subarray(0, 4).equals(Buffer.from('%PDF'))) fail(`PDF magic bad: ${rel}`);
    else pass(`PDF ok: ${rel} (${buf.length} bytes)`);
  }

  // Zip valid
  const zipPath = join(root, 'submission', 'submission-package.zip');
  const zipBuf = await readFile(zipPath);
  if (zipBuf.length < 100) fail(`zip too small: ${zipBuf.length}`);
  // PK header
  if (zipBuf[0] !== 0x50 || zipBuf[1] !== 0x4b) fail('zip magic not PK');
  else pass(`zip magic ok (${zipBuf.length} bytes)`);
  const zr = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}').Entries.Count`,
    ],
    { encoding: 'utf8' },
  );
  if (zr.status !== 0) fail(`zip open failed: ${zr.stderr}`);
  else pass(`zip entries: ${zr.stdout.trim()}`);

  // Manifest hashes
  let hashMismatches = 0;
  for (const node of manifest.nodes) {
    for (const f of node.files) {
      try {
        await access(join(root, f.path));
      } catch {
        fail(`missing file listed in manifest: ${f.path}`);
        continue;
      }
      const actual = await sha256(f.path);
      if (actual !== f.sha256) {
        hashMismatches += 1;
        fail(`hash mismatch ${f.path}\n  manifest=${f.sha256}\n  actual  =${actual}`);
      }
    }
  }
  if (hashMismatches === 0) pass(`all ${manifest.nodes.reduce((n, x) => n + x.files.length, 0)} manifest hashes match`);

  // generation.json honesty
  const gen = JSON.parse(await readFile(join(root, 'experiment', 'figures', 'generation.json'), 'utf8'));
  for (const key of ['comparison', 'architecture']) {
    if (gen[key].status !== 'generated') fail(`generation.json ${key}.status should be generated`);
    if (gen[key].tool !== 'OpenAI built-in image_gen') fail(`generation.json ${key} tool provenance missing`);
    const actual = await sha256(`experiment/figures/${key}.png`);
    if (gen[key].outputSha256 !== actual) fail(`generation.json ${key} hash mismatch`);
    else pass(`generation.json ${key} hash matches`);
  }

  // structured missing
  if (!Array.isArray(manifest.missing) || typeof manifest.missing[0] !== 'object') {
    fail('missing[] should be structured objects in v3');
  } else pass(`missing entries: ${manifest.missing.length}`);

  console.log(JSON.stringify({ pass: ok.length, fail: errors.length, errors, samplePass: ok.slice(0, 8) }, null, 2));
  if (errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
