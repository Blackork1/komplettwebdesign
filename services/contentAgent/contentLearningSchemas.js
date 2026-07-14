import { z } from 'zod';

import { CONTENT_LEARNING_CATEGORIES } from './contentLearningTaxonomy.js';

const categoryKeys = [...Object.keys(CONTENT_LEARNING_CATEGORIES), 'unclassified'];

export const LearningClassificationSchema = z.object({
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  categoryKey: z.enum(categoryKeys),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(500)
}).strict();

export const LearningClassificationBatchSchema = z.object({
  classifications: z.array(LearningClassificationSchema).min(1).max(12)
}).strict().superRefine(({ classifications }, context) => {
  const fingerprints = new Set();
  classifications.forEach(({ fingerprint }, index) => {
    if (fingerprints.has(fingerprint)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['classifications', index, 'fingerprint'],
        message: 'Jeder Fingerabdruck darf nur einmal klassifiziert werden.'
      });
    }
    fingerprints.add(fingerprint);
  });
});
