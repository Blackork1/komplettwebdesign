import { z } from 'zod';

export const ARTICLE_SCHEMA_VERSION = 'article-schema-v2';
import * as cheerio from 'cheerio';
import { CONTENT_AGENT_LINKS } from '../../data/contentAgentLinks.js';

const ASCII_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ASCII_WEBP_FILENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const APPROVED_INTERNAL_LINK_URLS = CONTENT_AGENT_LINKS.map(({ url }) => url);

const NonEmptyString = z.string().trim().min(1);
const GeneratedMetadataString = NonEmptyString.max(500);
const Score = z.number().min(0).max(10);
const HttpsUrlString = z.string()
  .regex(/^https:\/\/\S+$/, 'Quellen müssen eine gültige HTTPS-URL verwenden.')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && Boolean(url.hostname);
    } catch {
      return false;
    }
  }, 'Quellen müssen eine gültige HTTPS-URL verwenden.');

function inspectArticleFragment(html) {
  const $ = cheerio.load(html, null, false);
  const topLevelContent = $.root().contents().toArray().filter((node) => {
    if (node.type === 'comment') return false;
    if (node.type === 'text') return $(node).text().trim() !== '';
    return true;
  });
  const outerElement = topLevelContent.length === 1 && topLevelContent[0].type === 'tag'
    ? $(topLevelContent[0])
    : null;
  const outerClasses = (outerElement?.attr('class') || '').split(/\s+/).filter(Boolean);

  return {
    containsH1: $('h1').length > 0,
    hasOuterBootstrapContainer: outerClasses.some((className) => (
      className === 'container' || className.startsWith('container-')
    ))
  };
}

export const RiskSchema = z.object({
  currentClaims: z.boolean(),
  legalClaims: z.boolean(),
  privacyClaims: z.boolean(),
  softwareVersionClaims: z.boolean(),
  staticPrices: z.boolean()
}).strict();

export const TopicCandidateSchema = z.object({
  topic: NonEmptyString,
  suggestedTitle: NonEmptyString,
  slug: z.string().regex(ASCII_SLUG, 'Der Slug muss ausschließlich ASCII-Kleinbuchstaben, Ziffern und Bindestriche enthalten.'),
  primaryKeyword: NonEmptyString,
  secondaryKeywords: z.array(NonEmptyString).min(1).max(12),
  contentCluster: GeneratedMetadataString,
  searchIntent: GeneratedMetadataString,
  targetAudience: GeneratedMetadataString,
  source: NonEmptyString,
  readerProblem: NonEmptyString,
  concreteReaderBenefit: NonEmptyString,
  businessGoal: GeneratedMetadataString,
  ctaType: GeneratedMetadataString,
  requiresCurrentSources: z.boolean(),
  businessValue: Score,
  searchOpportunity: Score,
  problemPurchaseProximity: Score,
  internalLinkPotential: Score,
  clusterFit: Score,
  localRelevance: Score,
  cannibalizationRisk: Score
}).strict();

export const TopicCandidatesSchema = z.object({
  candidates: z.array(TopicCandidateSchema).min(1).max(20)
}).strict();

export const OutlineItemSchema = z.object({
  heading: NonEmptyString,
  level: z.enum(['h2', 'h3']),
  purpose: NonEmptyString
}).strict();

export const InternalLinkSchema = z.object({
  url: z.enum(APPROVED_INTERNAL_LINK_URLS, {
    errorMap: () => ({ message: 'Der interne Link ist nicht freigegeben.' })
  }),
  label: NonEmptyString,
  purpose: NonEmptyString
}).strict();

export const SourceRequirementSchema = z.object({
  requiresCurrentSources: z.boolean(),
  requiredTopics: z.array(NonEmptyString).max(8)
}).strict();

export const ImageIdeaSchema = z.object({
  prompt: NonEmptyString,
  altText: NonEmptyString,
  filename: z.string().regex(ASCII_WEBP_FILENAME, 'Der Bilddateiname muss ein ASCII-Slug mit der Endung .webp sein.')
}).strict();

export const SourceReferenceSchema = z.object({
  title: NonEmptyString,
  url: HttpsUrlString,
  publisher: NonEmptyString.nullish(),
  publishedAt: z.string().regex(ISO_DATE, 'Das Veröffentlichungsdatum muss YYYY-MM-DD verwenden.').nullish(),
  retrievedAt: z.string().regex(ISO_DATE, 'Das Abrufdatum muss YYYY-MM-DD verwenden.').nullish()
}).strict();

export const SeoBriefSchema = z.object({
  topic: NonEmptyString,
  workingTitle: NonEmptyString,
  primaryKeyword: NonEmptyString,
  secondaryKeywords: z.array(NonEmptyString).min(1).max(12),
  searchIntent: GeneratedMetadataString,
  targetAudience: GeneratedMetadataString,
  readerProblem: NonEmptyString,
  contentCluster: GeneratedMetadataString,
  businessGoal: GeneratedMetadataString,
  ctaType: GeneratedMetadataString,
  targetWordCount: z.number().int().min(1200).max(3200),
  outline: z.array(OutlineItemSchema).min(5).max(16),
  localExamples: z.array(NonEmptyString).max(8),
  internalLinks: z.array(InternalLinkSchema).min(2).max(8),
  faqQuestions: z.array(NonEmptyString).min(5).max(7),
  sourceRequirements: SourceRequirementSchema,
  sourceReferences: z.array(SourceReferenceSchema).min(2).max(6).nullish(),
  imageIdea: ImageIdeaSchema
}).strict().superRefine((brief, context) => {
  if (brief.sourceRequirements.requiresCurrentSources && !brief.sourceReferences) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sourceReferences'],
      message: 'Aktuelle Themen benötigen zwei bis sechs belastbare Quellen.'
    });
  }
});

export const FaqItemSchema = z.object({
  question: NonEmptyString,
  answer: NonEmptyString
}).strict();

export const ArticleSeoSchema = z.object({
  primaryKeyword: NonEmptyString,
  secondaryKeywords: z.array(NonEmptyString).min(1).max(12),
  searchIntent: GeneratedMetadataString,
  targetAudience: GeneratedMetadataString,
  contentCluster: GeneratedMetadataString
}).strict();

export const ArticleLeadSchema = z.object({
  businessGoal: GeneratedMetadataString,
  ctaType: GeneratedMetadataString,
  ctaPositions: z.array(z.enum(['blog_early', 'blog_mid', 'blog_final']))
    .length(3)
    .superRefine((positions, context) => {
      const expected = ['blog_early', 'blog_mid', 'blog_final'];
      if (positions.some((position, index) => position !== expected[index])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CTA-Positionen müssen früh, mittig und abschließend in dieser Reihenfolge vorliegen.'
        });
      }
    })
}).strict();

export const ArticleSelfCheckSchema = z.object({
  searchIntentFulfilled: z.boolean(),
  noH1: z.literal(true),
  noOuterBootstrapContainer: z.literal(true),
  noInventedPricesOrServices: z.boolean(),
  faqMatchesHtml: z.boolean(),
  approvedLinksOnly: z.boolean()
}).strict();

export const ArticleOutputSchema = z.object({
  title: NonEmptyString,
  shortDescription: NonEmptyString,
  metaTitle: NonEmptyString,
  metaDescription: NonEmptyString.max(160),
  ogTitle: NonEmptyString,
  ogDescription: NonEmptyString,
  slug: z.string().regex(ASCII_SLUG, 'Der Slug muss ausschließlich ASCII-Kleinbuchstaben, Ziffern und Bindestriche enthalten.'),
  contentHtml: z.string()
    .min(5000)
    .superRefine((html, context) => {
      const inspection = inspectArticleFragment(html);
      if (inspection.containsH1) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Artikel-HTML darf keine H1 enthalten.' });
      }
      if (inspection.hasOuterBootstrapContainer) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Artikel-HTML darf keinen äußeren Bootstrap-Container enthalten.' });
      }
    }),
  faqJson: z.array(FaqItemSchema).min(5).max(7),
  category: NonEmptyString,
  imagePrompt: NonEmptyString,
  imageAlt: NonEmptyString,
  imageFilename: z.string().regex(ASCII_WEBP_FILENAME, 'Der Bilddateiname muss ein ASCII-Slug mit der Endung .webp sein.'),
  seo: ArticleSeoSchema,
  lead: ArticleLeadSchema,
  sourceReferences: z.array(SourceReferenceSchema).max(6),
  risk: RiskSchema,
  qualitySelfCheck: ArticleSelfCheckSchema
}).strict();

export const ReviewIssueSchema = z.object({
  code: NonEmptyString,
  severity: z.enum(['info', 'warning', 'error']),
  message: NonEmptyString,
  repairInstruction: NonEmptyString,
  blocking: z.boolean(),
  sectionHeading: z.string().trim().max(180).nullable().optional().default(null),
  evidenceExcerpt: z.string().trim().max(280).nullable().optional().default(null),
  verificationType: z.enum(['none', 'source', 'date', 'price', 'version', 'legal', 'privacy'])
    .optional().default('none'),
  sourceRequired: z.boolean().optional().default(false),
  autoPublishBlocking: z.boolean().optional().default(false)
}).strict();

export const ReviewOutputSchema = z.object({
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  summary: NonEmptyString,
  strengths: z.array(NonEmptyString).max(12),
  issues: z.array(ReviewIssueSchema).max(24),
  recommendedActions: z.array(NonEmptyString).max(12),
  requiresManualReview: z.boolean(),
  risks: RiskSchema
}).strict();
