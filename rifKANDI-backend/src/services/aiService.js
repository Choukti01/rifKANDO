const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/database'); // Add this import

// Initialize Gemini - handle missing API key gracefully
let genAI;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== '') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Google Gemini AI initialized');
  } else {
    console.warn('⚠️ GEMINI_API_KEY not found. AI features will use smart fallback mode.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Gemini:', error.message);
}

class AIService {
  // Get the model
  static getModel() {
    if (!genAI) {
      return null;
    }
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  // Generate product description
  static async generateDescription(title, category, keywords) {
    // Smart fallback without AI
    if (!this.getModel()) {
      return `✨ ${title} - High quality product from rifKANDO marketplace. Perfect for your needs in Morocco. Competitive price, excellent quality. Shop with confidence! Fast delivery across Morocco.`;
    }

    const prompt = `Write a professional, persuasive product description for rifKANDO marketplace (Moroccan audience).
    
    Product title: "${title}"
    Category: ${category}
    Keywords: ${keywords || title}
    
    Style: Friendly, trustworthy, highlight benefits. Include emojis naturally. 50-80 words.
    Make it sound authentic and engaging.`;

    try {
      const model = this.getModel();
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('AI generation error:', error.message);
      return `✨ ${title} - Discover this amazing product on rifKANDO. Quality guaranteed, fast shipping across Morocco. Order now!`;
    }
  }

  // Parse natural language search query
  static async parseSearchQuery(query) {
    if (!this.getModel()) {
      // Smart fallback parsing
      const parsed = { keyword: query };
      if (query.toLowerCase().includes('under')) {
        const match = query.match(/under\s*(\d+)/i);
        if (match) parsed.max_price = parseInt(match[1]);
      }
      if (query.toLowerCase().includes('used')) parsed.condition = 'used';
      if (query.toLowerCase().includes('new')) parsed.condition = 'new';
      return parsed;
    }

    const prompt = `Parse this user search query: "${query}"
    Return ONLY JSON: {"category":"","min_price":0,"max_price":0,"keyword":"","condition":"","sort_by":""}
    Available categories: electronics, fashion, handicrafts, books, home`;

    try {
      const model = this.getModel();
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { keyword: query };
    } catch {
      return { keyword: query };
    }
  }

  // Suggest optimal price
  static async suggestPrice(title, category, similarPrices) {
    if (!this.getModel() || !similarPrices.length) {
      if (similarPrices.length) {
        const avg = similarPrices.reduce((a, b) => a + b, 0) / similarPrices.length;
        return Math.round(avg);
      }
      return null;
    }

    const prompt = `Suggest optimal price in MAD for: "${title}". Similar prices: ${similarPrices.join(', ')}. Return ONLY a number.`;

    try {
      const model = this.getModel();
      const result = await model.generateContent(prompt);
      const price = parseInt(result.response.text());
      return isNaN(price) ? null : price;
    } catch {
      return null;
    }
  }

  // Detect fraudulent listings
  static async detectFraud(title, description, price, category) {
    if (!this.getModel()) {
      return { is_fraudulent: false, confidence: 0, reasons: [], suggested_action: "review" };
    }

    const prompt = `Analyze listing for fraud. Title: "${title}", Price: ${price} MAD. Return JSON: {"is_fraudulent": true/false, "confidence": 0-100, "reasons": [], "suggested_action": "flag/block/review"}`;

    try {
      const model = this.getModel();
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { is_fraudulent: false, confidence: 0, reasons: [], suggested_action: "review" };
    } catch {
      return { is_fraudulent: false, confidence: 0, reasons: [], suggested_action: "review" };
    }
  }

  // Answer buyer questions - SMART FALLBACK INCLUDED
  static async answerQuestion(productTitle, productDescription, question) {
    const lowerQuestion = question.toLowerCase();
    const lowerTitle = productTitle.toLowerCase();
    const lowerDesc = productDescription.toLowerCase();
    
    // Smart fallback without AI - handles common questions
    if (lowerQuestion.includes('shipping') || lowerQuestion.includes('delivery')) {
      return `📦 Shipping for "${productTitle}" typically takes 3-7 business days within Morocco. Free shipping on orders over 500 MAD. You can contact the seller for exact delivery times.`;
    }
    
    if (lowerQuestion.includes('return') || lowerQuestion.includes('refund')) {
      return `🔄 rifKANDO offers a 14-day money-back guarantee and 7-day return policy for "${productTitle}". Returns are processed within 3-5 business days.`;
    }
    
    if (lowerQuestion.includes('authentic') || lowerQuestion.includes('real') || lowerQuestion.includes('genuine')) {
      return `✅ rifKANDO verifies all sellers. This product "${productTitle}" comes from a verified seller. Check the seller's profile for their ratings and reviews.`;
    }
    
    if (lowerQuestion.includes('material') || lowerQuestion.includes('made of') || lowerQuestion.includes('fabric')) {
      if (lowerDesc.includes('leather')) return `🧵 This product is made of genuine leather, high quality and durable.`;
      if (lowerDesc.includes('cotton')) return `👕 This product is made of 100% cotton, soft and breathable.`;
      if (lowerDesc.includes('wool')) return `🧶 This product is made of premium wool, warm and comfortable.`;
      if (lowerDesc.includes('silver')) return `✨ This product is made of genuine silver, beautifully crafted.`;
      if (lowerDesc.includes('wood')) return `🪵 This product is handcrafted from quality wood.`;
      return `🔍 Based on the description, please check the product details above or contact the seller for specific material information.`;
    }
    
    if (lowerQuestion.includes('size') || lowerQuestion.includes('fit') || lowerQuestion.includes('measurement')) {
      return `📏 For sizing information about "${productTitle}", please check the product description or message the seller directly. They can provide exact measurements.`;
    }
    
    if (lowerQuestion.includes('warranty')) {
      return `🛡️ This product comes with rifKANDO's buyer protection. For specific warranty details, please contact the seller.`;
    }
    
    if (lowerQuestion.includes('price') || lowerQuestion.includes('discount') || lowerQuestion.includes('negotiate')) {
      return `💰 The current price is shown above. Sellers may offer discounts for bulk purchases – use the "Message Seller" button to negotiate.`;
    }
    
    if (lowerQuestion.includes('color') || lowerQuestion.includes('colour')) {
      if (lowerDesc.includes('brown')) return `🎨 This product is available in brown. Check the product images for exact color.`;
      if (lowerDesc.includes('black')) return `🎨 This product is available in black. Check the product images for exact color.`;
      if (lowerDesc.includes('white')) return `🎨 This product is available in white. Check the product images for exact color.`;
      return `🎨 Check the product images above for available colors. You can also message the seller for more options.`;
    }
    
    if (lowerQuestion.includes('stock') || lowerQuestion.includes('available')) {
      return `📦 Stock availability is shown above. If in stock, your order will be processed within 24 hours.`;
    }

    // If we have AI available, use it for complex questions
    if (this.getModel()) {
      const prompt = `Product: "${productTitle}". Description: "${productDescription.substring(0, 500)}". Buyer asks: "${question}". Answer helpfully and concisely in 1-2 sentences.`;

      try {
        const model = this.getModel();
        const result = await model.generateContent(prompt);
        const aiAnswer = result.response.text();
        if (aiAnswer && aiAnswer.length > 10) {
          return aiAnswer;
        }
      } catch (error) {
        console.error('AI error:', error.message);
      }
    }
    
    // Ultimate fallback - useful and friendly
    return `🤔 I'm rifKANDO-AI. For specific questions about "${productTitle}", here's what you can do:
    
1️⃣ Check the product description above for details
2️⃣ Click "Message Seller" to ask the seller directly  
3️⃣ Check seller reviews for more insights

Is there anything specific about this product I can help with? Try asking about shipping, returns, materials, or size!`;
  }

  // Generate weekly admin report
  static async generateAdminReport(stats) {
    if (!this.getModel()) {
      return `📊 Weekly Report (${new Date().toLocaleDateString()}):\n\n• Total products: ${stats.totalProducts}\n• New this week: ${stats.newProducts}\n• Total sales: ${stats.totalSales} MAD\n• Top categories: ${stats.topCategories}\n• Low stock items: ${stats.lowStockCount}\n\n💡 Recommendation: Restock popular items and promote top categories.`;
    }

    const prompt = `Generate weekly report: ${JSON.stringify(stats)}. Include recommendations. 100 words.`;

    try {
      const model = this.getModel();
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch {
      return `📊 Week ${new Date().toLocaleDateString()}: ${stats.totalProducts} products, ${stats.totalSales} MAD sales. Top: ${stats.topCategories}.`;
    }
  }

  // ==================== FRAUD DETECTION METHODS ====================
  
  // Advanced fraud detection for products
  static async analyzeProductForFraud(product) {
    const { title, description, price, category, seller_id } = product;
    
    // 1. Price anomaly detection
    let priceRisk = 0;
    let priceReason = '';
    
    // Get average price for similar products
    const avgPrice = await this.getAveragePriceByCategory(category);
    if (avgPrice) {
      const priceRatio = price / avgPrice;
      if (priceRatio < 0.3) {
        priceRisk = 40;
        priceReason = `Price is ${Math.round((1 - priceRatio) * 100)}% below market average`;
      } else if (priceRatio > 3) {
        priceRisk = 20;
        priceReason = `Price is ${Math.round((priceRatio - 1) * 100)}% above market average`;
      }
    }
    
    // 2. Title & description analysis
    let textRisk = 0;
    const textReasons = [];
    
    const suspiciousWords = ['miracle', 'guaranteed', '100% authentic', 'genuine', 'original', 'unbelievable', 'too good to be true'];
    const urgentWords = ['limited stock', 'last chance', 'hurry', 'act now', 'selling fast'];
    const spamPatterns = ['www.', 'http://', 'click here', 'visit our website', 'external link'];
    
    for (const word of suspiciousWords) {
      if (title.toLowerCase().includes(word) || description.toLowerCase().includes(word)) {
        textRisk += 10;
        textReasons.push(`Contains suspicious word: "${word}"`);
      }
    }
    
    for (const word of urgentWords) {
      if (description.toLowerCase().includes(word)) {
        textRisk += 5;
        textReasons.push(`Urgency language: "${word}"`);
      }
    }
    
    for (const pattern of spamPatterns) {
      if (description.toLowerCase().includes(pattern)) {
        textRisk += 15;
        textReasons.push(`Contains external link or spam pattern`);
      }
    }
    
    // 3. Seller behavior analysis
    let sellerRisk = 0;
    const sellerReasons = [];
    
    const sellerProducts = await this.getSellerProductCount(seller_id);
    const sellerAge = await this.getSellerAccountAge(seller_id);
    
    if (sellerProducts > 50 && sellerAge < 7) {
      sellerRisk = 30;
      sellerReasons.push(`New seller (${sellerAge} days) listing ${sellerProducts} products rapidly`);
    }
    
    if (sellerAge < 1) {
      sellerRisk = 20;
      sellerReasons.push(`Account is less than 1 day old`);
    }
    
    // 4. AI analysis (if Gemini available)
    let aiRisk = 0;
    let aiReasons = [];
    let aiSuggestion = '';
    
    if (this.getModel()) {
      const prompt = `Analyze this product listing for fraud risk on a Moroccan marketplace.
      
      Title: "${title}"
      Description: "${description.substring(0, 500)}"
      Price: ${price} MAD
      Category: ${category}
      
      Return JSON: 
      {
        "risk_score": 0-100,
        "reasons": ["reason1", "reason2"],
        "suggestion": "approve/flag/block",
        "confidence": 0-100
      }
      
      Red flags: unrealistic price, scam language, too good to be true, fake brand claims.`;

      try {
        const model = this.getModel();
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          aiRisk = aiResult.risk_score || 0;
          aiReasons = aiResult.reasons || [];
          aiSuggestion = aiResult.suggestion || 'review';
        }
      } catch (error) {
        console.error('AI fraud analysis error:', error);
      }
    }
    
    // Calculate total risk score
    const totalRisk = Math.min(100, priceRisk + textRisk + sellerRisk + aiRisk);
    
    // Determine action
    let action = 'approve';
    let status = 'approved';
    if (totalRisk >= 70) {
      action = 'block';
      status = 'blocked';
    } else if (totalRisk >= 40) {
      action = 'flag';
      status = 'flagged';
    }
    
    const allFlags = [...textReasons, ...sellerReasons, ...aiReasons];
    if (priceReason) allFlags.unshift(priceReason);
    
    return {
      risk_score: totalRisk,
      action,
      status,
      flags: allFlags,
      ai_analysis: {
        price_anomaly: priceReason ? { score: priceRisk, reason: priceReason } : null,
        text_flags: textReasons,
        seller_flags: sellerReasons,
        ai_flags: aiReasons,
        ai_suggestion: aiSuggestion
      }
    };
  }

  // Helper: Get average price by category
  static async getAveragePriceByCategory(category) {
    return new Promise((resolve) => {
      db.get('SELECT AVG(price) as avg_price FROM products WHERE category = ? AND status = "published"', [category], (err, row) => {
        if (err || !row || !row.avg_price) resolve(null);
        else resolve(row.avg_price);
      });
    });
  }

  // Helper: Get seller product count in last 7 days
  static async getSellerProductCount(sellerId) {
    return new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND created_at > datetime("now", "-7 days")', [sellerId], (err, row) => {
        if (err) resolve(0);
        else resolve(row?.count || 0);
      });
    });
  }

  // Helper: Get seller account age in days
  static async getSellerAccountAge(sellerId) {
    return new Promise((resolve) => {
      db.get('SELECT julianday("now") - julianday(created_at) as age FROM users WHERE id = ?', [sellerId], (err, row) => {
        if (err) resolve(999);
        else resolve(Math.floor(row?.age || 999));
      });
    });
  }
}

module.exports = AIService;