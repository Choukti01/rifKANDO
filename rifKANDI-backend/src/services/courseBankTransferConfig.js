// Reuse the deployment configuration used by Services. The account details
// remain in the environment and must only be returned to an authenticated
// buyer as part of their own pending payment instructions.
function getCourseBankTransferConfig(env = process.env) {
  const accountHolder = String(env.SELLER_COMMISSION_ACCOUNT_HOLDER || '').trim();
  const bankName = String(env.SELLER_COMMISSION_BANK_NAME || '').trim();
  const rib = String(env.SELLER_COMMISSION_RIB || '').replace(/\s+/g, '');
  if (!accountHolder || !bankName || !/^\d{20,34}$/.test(rib)) return null;
  return { accountHolder, bankName, rib };
}

module.exports = { getCourseBankTransferConfig };
