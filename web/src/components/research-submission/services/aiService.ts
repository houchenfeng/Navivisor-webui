import { MOCK_PAPER_CONTENT, MOCK_REBUTTAL_CONTENT, MOCK_ACKNOWLEDGMENTS } from '../data/mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateTitle(_prompt?: string): Promise<string> {
  await delay(1500);
  return MOCK_PAPER_CONTENT.title;
}

export async function generateAuthors(_prompt?: string): Promise<string> {
  await delay(1500);
  return MOCK_PAPER_CONTENT.authors;
}

export async function generateKeywords(_prompt?: string): Promise<string> {
  await delay(1200);
  return MOCK_PAPER_CONTENT.keywords;
}

export async function generateAbstract(_prompt?: string): Promise<string> {
  await delay(2000);
  return MOCK_PAPER_CONTENT.abstract;
}

export async function generateRebuttal(_reviews?: string): Promise<string> {
  await delay(2000);
  return MOCK_REBUTTAL_CONTENT;
}

export async function generateTldr(_abstract?: string): Promise<string> {
  await delay(1000);
  return MOCK_PAPER_CONTENT.tldr;
}

export async function generateAcknowledgments(_context?: string): Promise<string> {
  await delay(1800);
  return MOCK_ACKNOWLEDGMENTS;
}

const aiService = { generateTitle, generateAuthors, generateKeywords, generateAbstract, generateRebuttal, generateTldr, generateAcknowledgments };
export default aiService;
