import { z } from 'zod';
import { FaqItemSchema } from './articleSchemas.js';

const OPTIMIZABLE_FIELDS = [
  'title',
  'shortDescription',
  'metaTitle',
  'metaDescription',
  'ogTitle',
  'ogDescription',
  'contentHtml',
  'faqJson',
  'imageAlt'
];

const HTTPS_URL_PATTERN = /^https:\/\/[^\s]+$/iu;

function isAbsoluteHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname.length > 0
      && url.username.length === 0
      && url.password.length === 0;
  } catch {
    return false;
  }
}

const HttpsUrlSchema = z.string()
  .max(2_048)
  .regex(HTTPS_URL_PATTERN)
  .refine(isAbsoluteHttpsUrl);

const ChangeReasonSchema = z.object({
  field: z.enum(OPTIMIZABLE_FIELDS),
  auditCodes: z.array(z.string().regex(/^[a-z0-9_:-]{1,80}$/)).max(12),
  reason: z.string().min(1).max(500),
  sourceUrls: z.array(HttpsUrlSchema).max(6)
}).strict();

export const ExistingPostOptimizationOutputSchema = z.object({
  title: z.string().min(1).max(255),
  shortDescription: z.string().min(1).max(500),
  metaTitle: z.string().min(1).max(255),
  metaDescription: z.string().min(1).max(500),
  ogTitle: z.string().min(1).max(255),
  ogDescription: z.string().min(1).max(500),
  contentHtml: z.string().min(1).max(250_000),
  faqJson: FaqItemSchema.array().min(5).max(7),
  imageAlt: z.string().min(1).max(500),
  changeReasons: z.array(ChangeReasonSchema).min(1).max(30)
}).strict();
