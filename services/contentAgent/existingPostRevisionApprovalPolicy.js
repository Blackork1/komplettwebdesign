import {
  isSnapshotFingerprint,
  snapshotFingerprint as fingerprintSnapshot
} from './revisionSnapshotFingerprint.js';

function denied(reasonCode, reasonLabel) {
  return { allowed: false, reasonCode, reasonLabel };
}

function validReview(review, minimumScore) {
  const risks = review?.risks;
  const risksPassed = risks
    && typeof risks === 'object'
    && !Array.isArray(risks)
    && Object.keys(risks).length > 0
    && Object.values(risks).every((value) => value === false);
  const blockingIssue = Array.isArray(review?.issues)
    && review.issues.some((issue) => issue?.blocking === true || issue?.autoPublishBlocking === true);
  return review?.passed === true
    && Number.isInteger(review.score)
    && review.score >= minimumScore
    && review.requiresManualReview === false
    && risksPassed
    && !blockingIssue;
}

export function minimumExistingPostRevisionScore(report) {
  const beforeScore = report?.beforeScore;
  if (!Number.isInteger(beforeScore) || beforeScore < 0 || beforeScore > 100) return null;
  // Lokaler Auditwert und redaktioneller Reviewwert stammen aus unterschiedlichen Skalen.
  return 80;
}

export function evaluateExistingPostRevisionApproval({ revision, snapshotFingerprint } = {}) {
  if (!revision || revision.status !== 'draft') {
    return denied('revision_not_draft', 'Nur eine Entwurfsrevision kann freigegeben werden');
  }
  const report = revision.optimization_report_json;
  const revalidation = report?.revalidation;
  if (revalidation?.status !== 'passed') {
    const label = revalidation?.status === 'pending'
      ? 'Erneute Prüfung läuft'
      : 'Erneute Prüfung fehlt oder ist fehlgeschlagen';
    return denied('revalidation_not_passed', label);
  }
  const revisionVersion = Number(revision.revision_version);
  if (!Number.isInteger(revisionVersion) || revalidation.revisionVersion !== revisionVersion) {
    return denied('revalidation_version_mismatch', 'Prüfung gehört nicht zum aktuellen Revisionsstand');
  }
  let currentFingerprint = snapshotFingerprint;
  if (currentFingerprint === undefined) {
    try {
      currentFingerprint = fingerprintSnapshot(revision.snapshot_json);
    } catch {
      return denied('snapshot_invalid', 'Aktueller Revisionssnapshot ist ungültig');
    }
  }
  if (!isSnapshotFingerprint(currentFingerprint)
      || revalidation.snapshotFingerprint !== currentFingerprint) {
    return denied('revalidation_fingerprint_mismatch', 'Prüfung gehört nicht zum aktuellen Inhalt');
  }
  if (!Array.isArray(revalidation.unresolvedAuditCodes)
      || revalidation.unresolvedAuditCodes.length > 0) {
    return denied('audit_findings_unresolved', 'Auditbefunde sind noch nicht vollständig gelöst');
  }
  const minimumScore = minimumExistingPostRevisionScore(report);
  if (minimumScore == null
      || revalidation.minimumScore !== minimumScore
      || revalidation.score !== revalidation.review?.score
      || !validReview(revalidation.review, minimumScore)) {
    return denied('revalidation_quality_failed', 'Aktuelle Prüfung erfüllt die Freigabekriterien nicht');
  }
  return {
    allowed: true,
    reasonCode: 'approved',
    reasonLabel: 'Aktueller Revisionsstand vollständig geprüft'
  };
}
