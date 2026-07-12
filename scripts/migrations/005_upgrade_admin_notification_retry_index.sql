WITH ranked_admin_delivery_versions AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY post_id,
                        payload_json ->> 'reviewVersion',
                        COALESCE(payload_json ->> 'manualRetryOfDeliveryId', 'initial')
           ORDER BY created_at, id
         ) AS delivery_rank
  FROM content_notification_deliveries
  WHERE notification_type = 'admin_review'
    AND status <> 'cancelled'
    AND payload_json ? 'reviewVersion'
)
UPDATE content_notification_deliveries delivery
SET status = 'cancelled',
    last_error_code = COALESCE(
      delivery.last_error_code,
      'migration_duplicate_delivery_version'
    ),
    updated_at = NOW()
FROM ranked_admin_delivery_versions ranked
WHERE delivery.id = ranked.id
  AND ranked.delivery_rank > 1;

DROP INDEX IF EXISTS ux_content_notification_deliveries_admin_review;
CREATE UNIQUE INDEX ux_content_notification_deliveries_admin_review
  ON content_notification_deliveries (
    post_id,
    (payload_json ->> 'reviewVersion'),
    (COALESCE(payload_json ->> 'manualRetryOfDeliveryId', 'initial'))
  )
  WHERE notification_type = 'admin_review'
    AND status <> 'cancelled'
    AND payload_json ? 'reviewVersion';
