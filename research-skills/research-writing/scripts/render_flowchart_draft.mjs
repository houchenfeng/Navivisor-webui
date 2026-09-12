#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const [, , inputPath = '-', outputPath = '-'] = process.argv;

const input = inputPath === '-'
  ? await readStdin()
  : await readFile(inputPath, 'utf8');
const spec = JSON.parse(input);
const svg = render(spec);

if (outputPath === '-') {
  process.stdout.write(svg);
} else {
  await writeFile(outputPath, svg, 'utf8');
}

function render(spec) {
  const nodes = Array.isArray(spec.mainFlow) ? spec.mainFlow : [];
  const edges = Array.isArray(spec.edges) ? spec.edges : [];
  const panels = Array.isArray(spec.detailPanels) ? spec.detailPanels : [];
  const ids = new Set(nodes.map((node) => String(node.id)));

  if (!nodes.length) throw new Error('flowchart spec must contain mainFlow nodes');
  for (const node of nodes) {
    if (!node.id || !node.label) throw new Error('each node needs id and label');
  }
  for (const edge of edges) {
    if (!ids.has(String(edge.from)) || !ids.has(String(edge.to))) {
      throw new Error(`edge references unknown node: ${edge.from} -> ${edge.to}`);
    }
  }

  const width = Math.max(1660, nodes.length * 245 + 160);
  const mainY = 170;
  const nodeW = 210;
  const nodeH = 104;
  const gap = (width - 160 - nodes.length * nodeW) / Math.max(1, nodes.length - 1);
  const positions = new Map();
  const defs = [];
  const body = [];

  body.push(text(80, 64, escape(spec.title || 'Method Overview'), 30, 'title'));
  body.push(text(80, 98, 'Deterministic topology draft · labels and arrows are source-controlled', 14, 'subtitle'));

  nodes.forEach((node, index) => {
    const x = 80 + index * (nodeW + gap);
    positions.set(String(node.id), { x, y: mainY });
    body.push(`<g data-node-id="${escapeAttr(node.id)}">`);
    body.push(`<rect x="${x}" y="${mainY}" width="${nodeW}" height="${nodeH}" rx="16" class="node"/>`);
    body.push(`<rect x="${x}" y="${mainY}" width="8" height="${nodeH}" rx="4" class="accent accent-${index % 4}"/>`);
    body.push(text(x + 20, mainY + 46, escape(node.label), 15, 'node-label'));
    if (node.kind) body.push(text(x + 20, mainY + 75, escape(String(node.kind)), 11, 'node-kind'));
    body.push('</g>');
  });

  edges.forEach((edge) => {
    const from = positions.get(String(edge.from));
    const to = positions.get(String(edge.to));
    if (!from || !to) return;
    const x1 = from.x + nodeW;
    const x2 = to.x;
    const y = mainY + nodeH / 2;
    const marker = edge.kind === 'dashed-arrow' ? 'url(#arrow-dashed)' : 'url(#arrow)';
    body.unshift(`<line data-edge="${escapeAttr(`${edge.from}->${edge.to}`)}" x1="${x1}" y1="${y}" x2="${x2 - 10}" y2="${y}" class="edge ${edge.kind === 'dashed-arrow' ? 'edge-dashed' : ''}" marker-end="${marker}"/>`);
    if (edge.label) body.push(text((x1 + x2) / 2, mainY - 12, escape(edge.label), 11, 'edge-label', 'middle'));
  });

  const panelY = mainY + nodeH + 120;
  panels.forEach((panel, index) => {
    const x = 80 + index * ((width - 160) / Math.max(1, panels.length));
    const panelW = (width - 200) / Math.max(1, panels.length);
    body.push(`<g data-panel-id="${escapeAttr(panel.id || `panel-${index + 1}`)}">`);
    body.push(`<rect x="${x}" y="${panelY}" width="${panelW}" height="220" rx="18" class="panel"/>`);
    body.push(text(x + 24, panelY + 38, escape(panel.title || `Detail ${index + 1}`), 18, 'panel-title'));
    if (panel.description) body.push(text(x + 24, panelY + 72, escape(panel.description), 13, 'panel-description'));
    body.push('</g>');
  });

  const height = panels.length ? panelY + 260 : mainY + nodeH + 90;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escape(spec.title || 'Method Overview')}</title>
  <desc id="desc">Deterministic algorithm flowchart draft</desc>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker>
    <marker id="arrow-dashed" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker>
    <style>
      .node{fill:#fff;stroke:#cbd5e1;stroke-width:2}.panel{fill:#f8fafc;stroke:#cbd5e1;stroke-width:2;stroke-dasharray:9 7}
      .edge{stroke:#64748b;stroke-width:4;fill:none}.edge-dashed{stroke-dasharray:10 8}.title{font:700 30px Georgia,serif;fill:#0f172a}.subtitle{font:400 14px Arial,sans-serif;fill:#64748b}
      .node-label{font:700 17px Arial,sans-serif;fill:#0f172a}.node-kind{font:400 11px Arial,sans-serif;fill:#64748b}.edge-label{font:400 12px Arial,sans-serif;fill:#475569}.panel-title{font:700 18px Arial,sans-serif;fill:#0f172a}.panel-description{font:400 13px Arial,sans-serif;fill:#475569}
      .accent{fill:#3b82f6}.accent-1{fill:#14b8a6}.accent-2{fill:#f59e0b}.accent-3{fill:#84cc16}
    </style>
  </defs>${body.join('')}</svg>`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function escape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttr(value) {
  return escape(value).replaceAll('"', '&quot;');
}

function text(x, y, value, size, className, anchor = 'start') {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" class="${className}">${value}</text>`;
}
