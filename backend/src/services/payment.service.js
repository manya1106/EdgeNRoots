const { runInTransaction } = require('../db/transaction');
const PolicyRepository = require('../repositories/policy.repository');
const PaymentRepository = require('../repositories/payment.repository');
const AccountRepository = require('../repositories/account.repository');
const LedgerRepository = require('../repositories/ledger.repository');
const { validateCreatePayment, validateReversePayment } = require('../validators/payment.validator');
const { roundCurrency } = require('../utils/gst');
const {
  NotFoundError,
  ValidationError,
  OverpaymentError,
  ConflictError,
  AccountingError
} = require('../utils/errors');

class PaymentService {
  /**
   * Processes a policy payment with pessimistic locking (FOR UPDATE) to prevent race conditions.
   */
  static async processPayment(data) {
    const validated = validateCreatePayment(data);
    const amount = roundCurrency(validated.amount);

    return await runInTransaction(async (conn) => {
      // 1. Lock the policy row exclusively to serialize concurrent payment requests
      const policy = await PolicyRepository.findByIdForUpdate(validated.policy_id, conn);
      if (!policy) {
        throw new NotFoundError(`Policy with id ${validated.policy_id} not found`);
      }

      if (policy.status !== 'ACTIVE') {
        throw new ValidationError(`Cannot process payment for policy with status '${policy.status}'`);
      }

      // 2. Compute current outstanding balance directly from ledger entries inside the lock
      const summary = await LedgerRepository.getPolicyLedgerSummary(policy.id, conn);
      const totalPaid = summary ? roundCurrency(summary.total_paid) : 0.0;
      const outstanding = roundCurrency(Number(policy.total_premium) - totalPaid);

      // 3. Overpayment check
      if (amount > outstanding) {
        throw new OverpaymentError(
          `Payment amount (${amount}) exceeds outstanding balance (${outstanding}) for policy ${policy.policy_number}`
        );
      }

      // 4. Insert policy transaction (PAYMENT_RECEIVED)
      const transaction = await LedgerRepository.createPolicyTransaction(
        {
          policy_id: policy.id,
          type: 'PAYMENT_RECEIVED',
          amount,
          description: `Payment received of ${amount} for policy ${policy.policy_number}`
        },
        conn
      );

      // 5. Insert into payments table
      const payment = await PaymentRepository.create(
        {
          policy_id: policy.id,
          transaction_id: transaction.id,
          amount,
          payment_type: 'PAYMENT',
          reversal_of_payment_id: null
        },
        conn
      );

      // 6. Fetch Accounts for double-entry
      const cashAccount = await AccountRepository.findByCode('CASH', conn);
      const arAccount = await AccountRepository.findByCode('AR', conn);

      if (!cashAccount || !arAccount) {
        throw new AccountingError('Cash or AR account not configured in database');
      }

      // 7. Double-entry ledger entries:
      // Debit: CASH (Asset increases)
      // Credit: AR (Receivable Asset decreases)
      const ledgerEntries = [
        {
          transaction_id: transaction.id,
          policy_id: policy.id,
          account_id: cashAccount.id,
          debit: amount,
          credit: 0.0
        },
        {
          transaction_id: transaction.id,
          policy_id: policy.id,
          account_id: arAccount.id,
          debit: 0.0,
          credit: amount
        }
      ];

      // In-application assertion
      const appDebitSum = ledgerEntries.reduce((acc, curr) => acc + curr.debit, 0);
      const appCreditSum = ledgerEntries.reduce((acc, curr) => acc + curr.credit, 0);

      if (Math.abs(appDebitSum - appCreditSum) > 0.001) {
        throw new AccountingError(
          `Accounting imbalance in payment: Debit (${appDebitSum}) != Credit (${appCreditSum})`
        );
      }

      await LedgerRepository.createLedgerEntries(ledgerEntries, conn);

      // Verify at database level
      const { total_debit, total_credit } = await LedgerRepository.getTransactionDebitCredit(
        transaction.id,
        conn
      );

      if (Math.abs(total_debit - total_credit) > 0.001) {
        throw new AccountingError(
          `Database ledger verification failed for payment transaction ${transaction.id}`
        );
      }

      const newOutstanding = roundCurrency(outstanding - amount);

      return {
        payment_id: payment.id,
        policy_id: policy.id,
        transaction_id: transaction.id,
        amount,
        payment_type: 'PAYMENT',
        previous_outstanding: outstanding,
        remaining_outstanding: newOutstanding
      };
    });
  }

  /**
   * Reverses an existing payment using insert-only correction records.
   * Does NOT mutate or delete the original payment row.
   */
  static async reversePayment(data) {
    const validated = validateReversePayment(data);
    const originalPaymentId = validated.reversal_of_payment_id;

    return await runInTransaction(async (conn) => {
      // 1. Fetch original payment
      const originalPayment = await PaymentRepository.findById(originalPaymentId, conn);
      if (!originalPayment) {
        throw new NotFoundError(`Payment with id ${originalPaymentId} not found`);
      }

      if (originalPayment.payment_type === 'REVERSAL') {
        throw new ValidationError('Cannot reverse a transaction that is already a reversal');
      }

      // Check if original payment was already reversed
      const existingReversal = await PaymentRepository.findReversalForPayment(originalPaymentId, conn);
      if (existingReversal) {
        throw new ConflictError(`Payment ${originalPaymentId} has already been reversed by reversal payment #${existingReversal.id}`);
      }

      // Lock the policy row
      const policy = await PolicyRepository.findByIdForUpdate(originalPayment.policy_id, conn);
      if (!policy) {
        throw new NotFoundError(`Policy with id ${originalPayment.policy_id} not found`);
      }

      const amountToReverse = roundCurrency(Number(originalPayment.amount));

      // 2. Insert policy transaction (PAYMENT_REVERSED)
      const transaction = await LedgerRepository.createPolicyTransaction(
        {
          policy_id: policy.id,
          type: 'PAYMENT_REVERSED',
          amount: amountToReverse,
          description: `Reversal of payment #${originalPayment.id} for policy ${policy.policy_number}. Reason: ${validated.reason || 'Not specified'}`
        },
        conn
      );

      // 3. Insert immutable reversal payment row
      const reversalPayment = await PaymentRepository.create(
        {
          policy_id: policy.id,
          transaction_id: transaction.id,
          amount: amountToReverse,
          payment_type: 'REVERSAL',
          reversal_of_payment_id: originalPayment.id
        },
        conn
      );

      // 4. Fetch accounts
      const cashAccount = await AccountRepository.findByCode('CASH', conn);
      const arAccount = await AccountRepository.findByCode('AR', conn);

      if (!cashAccount || !arAccount) {
        throw new AccountingError('Cash or AR account not configured in database');
      }

      // 5. Reverse double-entry ledger entries:
      // Exact inverse of original payment:
      // Debit: AR (Accounts Receivable increases back)
      // Credit: CASH (Cash / Bank decreases back)
      const ledgerEntries = [
        {
          transaction_id: transaction.id,
          policy_id: policy.id,
          account_id: arAccount.id,
          debit: amountToReverse,
          credit: 0.0
        },
        {
          transaction_id: transaction.id,
          policy_id: policy.id,
          account_id: cashAccount.id,
          debit: 0.0,
          credit: amountToReverse
        }
      ];

      // In-application assertion
      const appDebitSum = ledgerEntries.reduce((acc, curr) => acc + curr.debit, 0);
      const appCreditSum = ledgerEntries.reduce((acc, curr) => acc + curr.credit, 0);

      if (Math.abs(appDebitSum - appCreditSum) > 0.001) {
        throw new AccountingError(
          `Accounting imbalance in reversal: Debit (${appDebitSum}) != Credit (${appCreditSum})`
        );
      }

      await LedgerRepository.createLedgerEntries(ledgerEntries, conn);

      // Verify at database level
      const { total_debit, total_credit } = await LedgerRepository.getTransactionDebitCredit(
        transaction.id,
        conn
      );

      if (Math.abs(total_debit - total_credit) > 0.001) {
        throw new AccountingError(
          `Database ledger verification failed for reversal transaction ${transaction.id}`
        );
      }

      // Compute new summary
      const summary = await LedgerRepository.getPolicyLedgerSummary(policy.id, conn);

      return {
        reversal_payment_id: reversalPayment.id,
        reversal_of_payment_id: originalPayment.id,
        policy_id: policy.id,
        transaction_id: transaction.id,
        amount_reversed: amountToReverse,
        current_outstanding: summary ? Number(summary.outstanding) : Number(policy.total_premium),
        total_paid_after_reversal: summary ? Number(summary.total_paid) : 0.0
      };
    });
  }

  static async getPaymentById(id) {
    const payment = await PaymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError(`Payment with id ${id} not found`);
    }
    return payment;
  }
}

module.exports = PaymentService;
