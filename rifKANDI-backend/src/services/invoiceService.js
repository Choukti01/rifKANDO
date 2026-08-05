const PDFDocument = require('pdfkit');

class InvoiceService {
  static async generateInvoiceBuffer(order, user, items) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).text('rifKANDO', { align: 'center' });
      doc.fontSize(10).text('Your Moroccan Marketplace', { align: 'center' });
      doc.moveDown();
      
      // Invoice title
      doc.fontSize(16).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Order info
      doc.fontSize(10);
      doc.text(`Invoice Number: INV-${order.order_number}`);
      doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString()}`);
      doc.text(`Order Status: ${order.status}`);
      doc.moveDown();
      
      // Customer info
      doc.text('Bill To:');
      doc.text(user.name);
      doc.text(user.email);
      doc.text(user.phone || '');
      doc.moveDown();
      
      // Items table header
      const startX = 50;
      let currentY = doc.y;
      doc.text('Item', startX, currentY);
      doc.text('Qty', startX + 300, currentY);
      doc.text('Price', startX + 350, currentY);
      doc.text('Total', startX + 450, currentY);
      doc.moveDown();
      doc.lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      
      // Items
      let total = 0;
      items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        doc.text(item.title.substring(0, 40), startX, doc.y);
        doc.text(item.quantity.toString(), startX + 300, doc.y);
        doc.text(`${item.price} MAD`, startX + 350, doc.y);
        doc.text(`${itemTotal} MAD`, startX + 450, doc.y);
        doc.moveDown();
      });
      
      doc.moveDown();
      doc.lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      
      // Total
      doc.fontSize(12).text(`Total: ${total} MAD`, { align: 'right' });
      
      // Footer
      doc.moveDown(2);
      doc.fontSize(8).text('Thank you for shopping with rifKANDO!', { align: 'center' });
      
      doc.end();
    });
  }
}

module.exports = InvoiceService;
