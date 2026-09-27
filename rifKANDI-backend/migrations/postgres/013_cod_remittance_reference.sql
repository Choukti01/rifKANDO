-- One real Toufiq remittance receipt must reconcile one COD fulfilment only.
CREATE UNIQUE INDEX idx_cod_fulfillments_settlement_reference
  ON cod_fulfillments(carrier_settlement_reference)
  WHERE carrier_settlement_reference IS NOT NULL;
