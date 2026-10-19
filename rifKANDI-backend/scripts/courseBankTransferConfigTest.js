const assert = require('node:assert/strict');
const { getCourseBankTransferConfig } = require('../src/services/courseBankTransferConfig');
assert.equal(getCourseBankTransferConfig({}), null);
assert.equal(getCourseBankTransferConfig({ SELLER_COMMISSION_ACCOUNT_HOLDER: 'Example', SELLER_COMMISSION_BANK_NAME: 'Example', SELLER_COMMISSION_RIB: 'invalid' }), null);
const env = { SELLER_COMMISSION_ACCOUNT_HOLDER: ' Example ', SELLER_COMMISSION_BANK_NAME: ' Example bank ', SELLER_COMMISSION_RIB: '00000000000000000000' };
assert.deepEqual(getCourseBankTransferConfig(env), { accountHolder: 'Example', bankName: 'Example bank', rib: '00000000000000000000' });
console.log('Course bank configuration tests passed');
