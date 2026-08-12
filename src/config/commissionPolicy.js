import commissionPolicy from '../../commission-policy.json'

export const COMMISSION_RATES = Object.freeze(commissionPolicy.commissionRates)
export const WITHDRAWAL_HOLD_DAYS = commissionPolicy.withdrawalHoldDays

export const formatCommissionRate = (type) => `${COMMISSION_RATES[type]}%`
