-- A return-required dispute remains active until COD Operations records the
-- return and a reconciliation controller closes the case. Keep the database
-- uniqueness rule aligned with the API and financial hold policy.
CREATE UNIQUE INDEX idx_order_disputes_one_active_per_fulfillment
  ON order_disputes(fulfillment_id)
  WHERE status IN ('open', 'in_review', 'return_required');
