-- Existing accepted service requests were created before the manual bank-transfer
-- protocol. Bring them into the founder reconciliation queue without changing
-- their service status or treating any transfer as paid.

INSERT INTO service_payment_transfers (
  service_order_id, buyer_id, provider_id, amount_minor, commission_minor, provider_payout_minor
)
SELECT
  so.id,
  so.buyer_id,
  so.provider_id,
  COALESCE(so.price_minor, ROUND(so.price * 100)::BIGINT),
  ROUND(COALESCE(so.price_minor, ROUND(so.price * 100)::BIGINT) * 0.05)::BIGINT,
  COALESCE(so.price_minor, ROUND(so.price * 100)::BIGINT)
    - ROUND(COALESCE(so.price_minor, ROUND(so.price * 100)::BIGINT) * 0.05)::BIGINT
FROM service_orders so
WHERE so.status IN ('accepted', 'in_progress', 'submitted', 'revision_requested', 'completed')
  AND COALESCE(so.price_minor, ROUND(so.price * 100)::BIGINT) > 0
ON CONFLICT (service_order_id) DO NOTHING;
