const db = require('../config/database');

class WalletService {
  // Get wallet balance for a user
  static async getWallet(userId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM wallets WHERE user_id = ?', [userId], (err, wallet) => {
        if (err) reject(err);
        else resolve(wallet || { available_balance: 0, escrow_balance: 0, pending_withdrawal: 0 });
      });
    });
  }

  // Get transaction history
  static async getTransactions(userId, limit = 50) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM wallet_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [userId, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Add funds to wallet
  static async addFunds(userId, amount, type, referenceId, description) {
    return new Promise(async (resolve, reject) => {
      const wallet = await this.getWallet(userId);
      const balanceBefore = wallet.available_balance;
      const balanceAfter = balanceBefore + amount;

      db.run('UPDATE wallets SET available_balance = ?, updated_at = datetime("now") WHERE user_id = ?', 
        [balanceAfter, userId], (err) => {
          if (err) reject(err);
          else {
            db.run(`
              INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, type, amount, balanceBefore, balanceAfter, referenceId, description], (err) => {
              if (err) reject(err);
              else resolve({ success: true, balance: balanceAfter });
            });
          }
        });
    });
  }

  // Deduct funds from wallet
  static async deductFunds(userId, amount, type, referenceId, description) {
    return new Promise(async (resolve, reject) => {
      const wallet = await this.getWallet(userId);
      if (wallet.available_balance < amount) {
        reject(new Error('Insufficient balance'));
        return;
      }

      const balanceBefore = wallet.available_balance;
      const balanceAfter = balanceBefore - amount;

      db.run('UPDATE wallets SET available_balance = ?, updated_at = datetime("now") WHERE user_id = ?', 
        [balanceAfter, userId], (err) => {
          if (err) reject(err);
          else {
            db.run(`
              INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [userId, type, amount, balanceBefore, balanceAfter, referenceId, description], (err) => {
              if (err) reject(err);
              else resolve({ success: true, balance: balanceAfter });
            });
          }
        });
    });
  }

  // Create escrow transaction (hold funds)
  static async createEscrow(orderId, buyerId, sellerId, amount, commission = 0) {
    return new Promise((resolve, reject) => {
      const sellerAmount = amount - commission;
      db.run(`
        INSERT INTO escrow_transactions (order_id, buyer_id, seller_id, amount, commission, seller_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, 'held')
      `, [orderId, buyerId, sellerId, amount, commission, sellerAmount], function(err) {
        if (err) reject(err);
        else resolve({ success: true, escrowId: this.lastID, sellerAmount });
      });
    });
  }

  // Release escrow funds to seller
  static async releaseEscrow(escrowId) {
    return new Promise(async (resolve, reject) => {
      const escrow = await new Promise((res, rej) => {
        db.get('SELECT * FROM escrow_transactions WHERE id = ?', [escrowId], (err, row) => {
          if (err) rej(err);
          else res(row);
        });
      });

      if (!escrow || escrow.status !== 'held') {
        reject(new Error('Escrow not found or already released'));
        return;
      }

      // Add funds to seller's wallet
      await this.addFunds(escrow.seller_id, escrow.seller_amount, 'sale', escrow.order_id, 
        `Payment for order #${escrow.order_id} (after ${escrow.commission} MAD commission)`);

      // Update escrow status
      db.run('UPDATE escrow_transactions SET status = "released", release_date = datetime("now") WHERE id = ?', 
        [escrowId], (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        });
    });
  }

  // Create withdrawal request
  static async requestWithdrawal(userId, amount, method, bankDetails) {
    return new Promise(async (resolve, reject) => {
      const wallet = await this.getWallet(userId);
      if (wallet.available_balance < amount) {
        reject(new Error('Insufficient balance'));
        return;
      }

      // Deduct from available, add to pending
      db.run(`
        UPDATE wallets 
        SET available_balance = available_balance - ?, 
            pending_withdrawal = pending_withdrawal + ?,
            updated_at = datetime("now")
        WHERE user_id = ?
      `, [amount, amount, userId], (err) => {
        if (err) reject(err);
        else {
          db.run(`
            INSERT INTO withdrawal_requests (user_id, amount, method, bank_details, status)
            VALUES (?, ?, ?, ?, 'pending')
          `, [userId, amount, method, JSON.stringify(bankDetails)], function(err) {
            if (err) reject(err);
            else resolve({ success: true, requestId: this.lastID });
          });
        }
      });
    });
  }
}

module.exports = WalletService;