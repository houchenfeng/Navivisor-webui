/**
 * Renders a QueryPlan into the concrete syntax of each retrieval source.
 *
 * These are pure functions on purpose: the AI produces concept groups and
 * draft queries, but the strings that actually hit the network are assembled
 * here so they can be unit-tested and diffed.
 */
import type { QueryPlan } from './query-planner';

/** Escapes a phrase for OpenAlex OQL: wraps in quotes, strips embedded quotes. */
function oqlPhrase(value: string): string {
  return `"${value.replace(/"/g, '').trim()}"`;
}

/** Escapes a phrase for arXiv: quotes and strips embedded quotes. */
function arxivPhrase(value: string): string {
  return `"${value.replace(/"/g, '').trim()}"`;
}

/** Escapes a phrase for Scopus TITLE-ABS-KEY. */
function scopusPhrase(value: string): string {
  return `"${value.replace(/"/g, '').trim()}"`;
}

function nonEmpty(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export type QueryVersion = 'versionA' | 'versionB';

/**
 * Builds an OpenAlex OQL string.
 *
 * Concept groups are joined with `and`; terms inside a group with `or`.
 * Exclusions are applied on the title only — excluding on abstract as well
 * removes too many legitimate hits.
 */
export function toOpenAlexOql(
  plan: Pick<QueryPlan, 'concepts' | 'exclusions'>,
  yearFrom: number,
  yearTo: number,
): string {
  const a = nonEmpty(plan.concepts.A);
  const b = nonEmpty(plan.concepts.B);
  const c = nonEmpty(plan.concepts.C);
  const excluded = nonEmpty(plan.exclusions);

  const blocks: string[] = [];
  if (a.length) {
    blocks.push(`title/abstract has (${a.map(oqlPhrase).join(' or ')})`);
  }
  if (b.length) {
    blocks.push(`title/abstract has (${b.map(oqlPhrase).join(' or ')})`);
  }
  if (c.length) {
    blocks.push(`title/abstract has (${c.map(oqlPhrase).join(' or ')})`);
  }

  const parts = [...blocks];
  if (excluded.length) {
    parts.push(`title has (not (${excluded.map(oqlPhrase).join(' or ')}))`);
  }
  parts.push(`from_publication_date:${yearFrom}-01-01`);
  parts.push(`to_publication_date:${yearTo}-12-31`);

  return parts.join(' and ');
}

/**
 * Builds the value of OpenAlex's `filter` parameter.
 *
 * This is the string that actually goes on the wire. The OQL above is for
 * humans and for the archive: OpenAlex has no `oql` request parameter at all,
 * and sending the OQL as one returns HTTP 400, which silently yields nothing.
 *
 * Within a single field `|` means OR; repeating a field means AND. There is no
 * NOT operator, so exclusions cannot be expressed here and are applied locally
 * by the caller instead.
 */
export function toOpenAlexFilter(
  plan: Pick<QueryPlan, 'concepts' | 'exclusions'>,
  yearFrom: number,
  yearTo: number,
): string {
  const parts: string[] = [];
  for (const group of [plan.concepts.A, plan.concepts.B, plan.concepts.C]) {
    const terms = nonEmpty(group);
    if (!terms.length) continue;
    parts.push(`title_and_abstract.search:${terms.map(filterTerm).join('|')}`);
  }
  parts.push(`from_publication_date:${yearFrom}-01-01`);
  parts.push(`to_publication_date:${yearTo}-12-31`);
  return parts.join(',');
}

/** `,` and `|` are structural in a filter value, so they cannot appear in a term. */
function filterTerm(value: string): string {
  return value.replace(/[,|]/g, ' ').trim();
}

/**
 * Builds an arXiv API query string.
 *
 * arXiv has no parenthesised boolean grouping, so precedence is expressed by
 * ordering: OR terms first, then ANDNOT exclusions.
 */
export function toArxivQuery(plan: Pick<QueryPlan, 'concepts' | 'exclusions'>): string {
  const terms = [
    ...nonEmpty(plan.concepts.A),
    ...nonEmpty(plan.concepts.B),
    ...nonEmpty(plan.concepts.C),
  ];
  if (!terms.length) return '';

  let query = terms.map((term) => `all:${arxivPhrase(term)}`).join(' OR ');
  for (const excluded of nonEmpty(plan.exclusions)) {
    query += ` ANDNOT all:${arxivPhrase(excluded)}`;
  }
  return query;
}

export type ScopusQueryResult = {
  status: 'needs_credentials';
  query: string;
};

/**
 * Builds a Scopus query string.
 *
 * Scopus requires an institutional API key that this deployment does not have,
 * so the query is returned but never executed. The `status` field keeps callers
 * honest about that.
 */
export function toScopusQuery(
  plan: Pick<QueryPlan, 'concepts' | 'exclusions'>,
): ScopusQueryResult {
  const terms = [
    ...nonEmpty(plan.concepts.A),
    ...nonEmpty(plan.concepts.B),
    ...nonEmpty(plan.concepts.C),
  ];
  const excluded = nonEmpty(plan.exclusions);

  let query = terms.length
    ? `TITLE-ABS-KEY(${terms.map(scopusPhrase).join(' OR ')})`
    : 'TITLE-ABS-KEY()';
  if (excluded.length) {
    query += ` AND NOT TITLE(${excluded.map(scopusPhrase).join(' OR ')})`;
  }
  return { status: 'needs_credentials', query };
}

/** Picks the version field of a plan, falling back to the other version. */
export function pickVersion(
  plan: QueryPlan,
  version: QueryVersion,
): { openalex: string; arxiv: string; scopus: string } {
  const other: QueryVersion = version === 'versionA' ? 'versionB' : 'versionA';
  return {
    openalex: plan.openalex[version] || plan.openalex[other] || '',
    arxiv: plan.arxiv[version] || plan.arxiv[other] || '',
    scopus: plan.scopus[version] || plan.scopus[other] || '',
  };
}
