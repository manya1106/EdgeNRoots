const PaymentService = require('../services/payment.service');
const { successResponse } = require('../utils/response');

class PaymentController {
  static async createPayment(req, res, next) {
    try {
      const payment = await PaymentService.processPayment(req.body);
      return successResponse(res, payment, 'Payment processed and ledger posted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async reversePayment(req, res, next) {
    try {
      const payload = {
        reversal_of_payment_id: req.params.id ? parseInt(req.params.id, 10) : req.body.reversal_of_payment_id,
        reason: req.body.reason
      };
      const reversal = await PaymentService.reversePayment(payload);
      return successResponse(res, reversal, 'Payment reversed successfully via immutable ledger entry', 200);
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentById(req, res, next) {
    try {
      const paymentId = parseInt(req.params.id, 10);
      const payment = await PaymentService.getPaymentById(paymentId);
      return successResponse(res, payment, 'Payment retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PaymentController;
