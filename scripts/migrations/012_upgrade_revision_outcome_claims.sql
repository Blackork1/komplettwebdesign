ALTER TABLE content_revision_optimization_outcomes
  ADD COLUMN IF NOT EXISTS evaluation_claim_token UUID,
  ADD COLUMN IF NOT EXISTS evaluation_claimed_at TIMESTAMPTZ;

UPDATE content_revision_optimization_outcomes
SET evaluation_status = 'waiting',
    evaluation_claim_token = NULL,
    evaluation_claimed_at = NULL,
    updated_at = NOW()
WHERE evaluation_status = 'ready'
  AND (
    evaluation_claim_token IS NULL
    OR evaluation_claimed_at IS NULL
  );

UPDATE content_revision_optimization_outcomes
SET evaluation_claim_token = NULL,
    evaluation_claimed_at = NULL,
    updated_at = NOW()
WHERE evaluation_status <> 'ready'
  AND (
    evaluation_claim_token IS NOT NULL
    OR evaluation_claimed_at IS NOT NULL
  );

ALTER TABLE content_revision_optimization_outcomes
  DROP CONSTRAINT IF EXISTS content_revision_optimization_outcomes_claim_consistent;
ALTER TABLE content_revision_optimization_outcomes
  ADD CONSTRAINT content_revision_optimization_outcomes_claim_consistent
  CHECK (
    (
      evaluation_status = 'ready'
      AND evaluation_claim_token IS NOT NULL
      AND evaluation_claimed_at IS NOT NULL
    )
    OR (
      evaluation_status <> 'ready'
      AND evaluation_claim_token IS NULL
      AND evaluation_claimed_at IS NULL
    )
  );
