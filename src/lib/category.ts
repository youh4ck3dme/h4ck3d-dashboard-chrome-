import type { ProjectCategory } from '../data/projects';

/** Ordered rules: first match wins. Word-boundary regexes avoid false hits like "em-ai-l" or "stud-ios". */
const RULES: [ProjectCategory, RegExp][] = [
  ['PWA', /\bpwa\b|progressive[\s-]web/],
  ['Firebase', /\bfirebase\b|\bfirestore\b/],
  ['AI', /\bai\b|\bllm\b|openai|\bgpt|machine[\s-]learning|\bml\b|anthropic|claude|gemini/],
  ['WordPress', /wordpress|\bwp[\s-]|\bphp\b|woocommerce/],
  ['DevOps', /devops|docker|kubernetes|\bk8s\b|ci[\s-]?cd|terraform|\bdeploy/],
  ['SaaS', /\bsaas\b|dashboard|\badmin\b|\bcrm\b|booking/],
  ['Mobile', /\bmobile\b|react[\s-]native|flutter|android|\bios\b|expo\b/],
  ['E-commerce', /e-?commerce|\bshop|\bstore\b|\bcart\b|eshop/],
];

export function inferCategoryFromText(text: string): ProjectCategory {
  const t = text.toLowerCase();
  for (const [category, re] of RULES) if (re.test(t)) return category;
  return 'Web';
}
