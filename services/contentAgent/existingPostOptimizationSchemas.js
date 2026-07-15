import { z } from 'zod';
import { FaqItemSchema } from './articleSchemas.js';
import {
  MAX_SAFE_HTTPS_URL_LENGTH,
  normalizeSafeHttpsUrl
} from './httpsUrlSafety.js';

export const EXISTING_POST_OPTIMIZATION_SCHEMA_VERSION = 'existing-post-optimization-schema-v2';

const BASE_OPTIMIZABLE_FIELDS = [
  'title',
  'shortDescription',
  'metaTitle',
  'metaDescription',
  'ogTitle',
  'ogDescription',
  'faqJson',
  'imageAlt'
];

const HTTPS_URL_PATTERN = /^https:\/\/[^\s]+$/iu;

const HttpsUrlSchema = z.string()
  .max(MAX_SAFE_HTTPS_URL_LENGTH)
  .regex(HTTPS_URL_PATTERN)
  .refine((value) => normalizeSafeHttpsUrl(value) !== null)
  .transform((value) => normalizeSafeHttpsUrl(value));

function createChangeReasonSchema(fields) {
  return z.object({
    field: z.enum(fields),
    auditCodes: z.array(z.string().regex(/^[a-z0-9_:-]{1,80}$/)).max(12),
    reason: z.string().min(1).max(500),
    sourceUrls: z.array(HttpsUrlSchema).max(6)
  }).strict();
}

const BaseOptimizationFields = {
  title: z.string().min(1).max(255),
  shortDescription: z.string().min(1).max(500),
  metaTitle: z.string().min(1).max(255),
  metaDescription: z.string().min(1).max(500),
  ogTitle: z.string().min(1).max(255),
  ogDescription: z.string().min(1).max(500),
  faqJson: FaqItemSchema.array().min(5).max(7),
  imageAlt: z.string().min(1).max(500)
};

export const ExistingPostOptimizationOutputSchema = z.object({
  ...BaseOptimizationFields,
  contentHtml: z.string().min(1).max(250_000),
  changeReasons: z.array(
    createChangeReasonSchema([...BASE_OPTIMIZABLE_FIELDS, 'contentHtml'])
  ).min(1).max(30)
}).strict();

export const LegacyExistingPostOptimizationOutputSchema = z.object({
  ...BaseOptimizationFields,
  changeReasons: z.array(
    createChangeReasonSchema(BASE_OPTIMIZABLE_FIELDS)
  ).min(1).max(30)
}).strict();
