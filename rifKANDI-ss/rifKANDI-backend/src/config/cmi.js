// CMI Payment Gateway Configuration for rifKANDI
// Based on official cmi-payment-nodejs package [citation:1][citation:6]

module.exports = {
  // CMI Credentials (get these from your CMI merchant account)
  storekey: process.env.CMI_STORE_KEY,
  clientid: process.env.CMI_CLIENT_ID,
  
  // URLs
  shopurl: process.env.CLIENT_URL,
  okUrl: `${process.env.BACKEND_URL}/api/payment/success`,
  failUrl: `${process.env.BACKEND_URL}/api/payment/fail`,
  callbackURL: `${process.env.BACKEND_URL}/api/payment/callback`,
  
  // Test mode (set to false for production)
  testMode: process.env.NODE_ENV !== 'production',
  
  // Currency code for MAD (Moroccan Dirham)
  currency: '504', // 504 = MAD [citation:8]
  
  // Language
  lang: 'en', // en, fr, ar
};