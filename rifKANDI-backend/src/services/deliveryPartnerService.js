const digits = (value) => String(value || '').replace(/\D/g, '');

// This is intentionally a named, human-operated launch partner rather than
// an unverified carrier API. The contact information is only returned to an
// authenticated seller with a confirmed COD order.
const DEFAULT_PARTNER = Object.freeze({
  name: 'Toufiq Zariohi',
  displayPhone: '0601805095',
  whatsappNumber: '212601805095',
  carrierNetwork: 'Najm Chamal and Ghazala',
});

const normalizedWhatsAppNumber = (value) => {
  const valueDigits = digits(value);
  if (!valueDigits) return DEFAULT_PARTNER.whatsappNumber;
  if (valueDigits.startsWith('00')) return valueDigits.slice(2);
  if (valueDigits.startsWith('0')) return `212${valueDigits.slice(1)}`;
  return valueDigits;
};

const getCodDeliveryPartner = () => ({
  name: String(process.env.COD_DELIVERY_PARTNER_NAME || DEFAULT_PARTNER.name).trim() || DEFAULT_PARTNER.name,
  displayPhone: String(process.env.COD_DELIVERY_PARTNER_PHONE || DEFAULT_PARTNER.displayPhone).trim() || DEFAULT_PARTNER.displayPhone,
  whatsappNumber: normalizedWhatsAppNumber(process.env.COD_DELIVERY_PARTNER_WHATSAPP || DEFAULT_PARTNER.whatsappNumber),
  carrierNetwork: String(process.env.COD_DELIVERY_PARTNER_NETWORK || DEFAULT_PARTNER.carrierNetwork).trim() || DEFAULT_PARTNER.carrierNetwork,
});

const createSellerHandoffLink = ({ orderNumber, itemTitle }) => {
  const partner = getCodDeliveryPartner();
  const safeOrderNumber = String(orderNumber || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
  const safeTitle = String(itemTitle || 'COD parcel').replace(/[\r\n]/g, ' ').trim().slice(0, 100);
  const message = `Hello ${partner.name}, I am the seller for rifKANDO COD order ${safeOrderNumber}. The parcel (${safeTitle}) is ready for pickup. Please confirm the handoff details and carrier tracking with me.`;
  return `https://wa.me/${partner.whatsappNumber}?text=${encodeURIComponent(message)}`;
};

module.exports = {
  getCodDeliveryPartner,
  createSellerHandoffLink,
};

