const { runInTransaction } = require('../db/transaction');
const PolicyRepository = require('../repositories/policy.repository');
const CustomerRepository = require('../repositories/customer.repository');
const AccountRepository = require('../repositories/account.repository');
const LedgerRepository = require('../repositories/ledger.repository');
const { validateCreatePolicy } = require('../validators/policy.validator');
const { calculateGst } = require('../utils/gst');
const {
  NotFoundError,
  ConflictError,
  AccountingError
} = require('../utils/errors');

class PolicyService {
  /**
   * Creates a new policy and books double-entry ledger entries atomically.
   */
  static async createPolicy(data) {
    const validated = validateCreatePolicy(data);

    // 1. Validate customer exists
    const customer = await CustomerRepository.findById(validated.customer_id);
    if (!customer) {
      throw new NotFoundError(`Customer with id ${validated.customer_id} does not exist`);
    }

    // 2. Validate policy_number uniqueness
    const existingPolicy = await PolicyRepository.findByPolicyNumber(validated.policy_number);
    if (existingPolicy) {
      throw new ConflictError(`Policy with number '${validated.policy_number}' already exists`);
    }

    // 3 & 4. Calculate tax and totals with financial rounding
    const { premiumAmount, gstRate, gstAmount, totalPremium } = calculateGst(
      validated.premium_amount,
      validated.gst_rate
    );

    // Execute atomic transaction for policy creation and double-entry ledger posting
    return await runInTransaction(async (conn) => {
      // 5. Insert policy record
      const policy = await PolicyRepository.create(
        {
          customer_id: validated.customer_id,
          policy_number: validated.policy_number,
          premium_amount: premiumAmount,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          total_premium: totalPremium,
          status: 'ACTIVE'
        },
        conn
      );

      // 6. Insert policy transaction (POLICY_CREATED)
      const transaction = await LedgerRepository.createPolicyTransaction(
        {
          policy_id: policy.id,
          type: 'POLICY_CREATED',
          amount: totalPremium,
          description: `Policy ${policy.policy_number} issued with premium ${premiumAmount} and GST ${gstAmount}`
        },
        conn
      );

      // Fetch chart of accounts
      const arAccount = await AccountRepository.findByCode('AR', conn);
      const incomeAccount = await AccountRepository.findByCode('INCOME_PREMIUM', conn);
      const gstAccount = await AccountRepository.findByCode('LIAB_GST', conn);

      if (!arAccount || !incomeAccount || !gstAccount) {
        throw new AccountingError('Standard chart of accounts not properly initialized in database');
      }

      // 7. Prepare double-entry ledger entries:
      // Debit: AR (Total Premium)
      // Credit: INCOME_PREMIUM (Base Premium)
      // Credit: LIAB_GST (GST Amount)
      const ledgerEntries = [
        {
          transaction_id: transaction.id,
          policy_id: policy.id,
          account_id: arAccount.id,
          debit: totalPremium,
          credit: 0.0
        },
        {
          transaction_id: transaction.id,
          policy_id: policy.id,
          account_id: incomeAccount.id,
          debit: 0.0,
          credit: premiumAmount
        },
        {
          transaction_id: transaction.id,
          policy_id: policy.id,
          account_id: gstAccount.id,
          debit: 0.0,
          credit: gstAmount
        }
      ];

      // In-application assertion: Total Debit === Total Credit
      const appDebitSum = ledgerEntries.reduce((acc, curr) => acc + curr.debit, 0);
      const appCreditSum = ledgerEntries.reduce((acc, curr) => acc + curr.credit, 0);

      if (Math.abs(appDebitSum - appCreditSum) > 0.001) {
        throw new AccountingError(
          `Accounting imbalance detected: Debit (${appDebitSum}) does not equal Credit (${appCreditSum})`
        );
      }

      // Insert ledger entries
      await LedgerRepository.createLedgerEntries(ledgerEntries, conn);

      // 8. Database level assertion before commit
      const { total_debit, total_credit } = await LedgerRepository.getTransactionDebitCredit(
        transaction.id,
        conn
      );

      if (Math.abs(total_debit - total_credit) > 0.001) {
        throw new AccountingError(
          `Database verification failed: Total Debit (${total_debit}) does not balance Total Credit (${total_credit})`
        );
      }

      return {
        ...policy,
        transaction_id: transaction.id,
        breakdown: {
          premium_amount: premiumAmount,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          total_premium: totalPremium
        }
      };
    });
  }

  /**
   * Retrieves policy details joined with customer information
   */
  static async getPolicyById(id) {
    const policy = await PolicyRepository.getPolicyWithCustomer(id);
    if (!policy) {
      throw new NotFoundError(`Policy with id ${id} not found`);
    }
    return policy;
  }

  /**
   * Retrieves all ledger entries for a policy
   */
  static async getPolicyLedger(id) {
    const policy = await PolicyRepository.findById(id);
    if (!policy) {
      throw new NotFoundError(`Policy with id ${id} not found`);
    }
    return await LedgerRepository.getLedgerEntriesByPolicyId(id);
  }

  /**
   * Retrieves summary computed directly from ledger entries
   */
  static async getPolicySummary(id) {
    const policy = await PolicyRepository.findById(id);
    if (!policy) {
      throw new NotFoundError(`Policy with id ${id} not found`);
    }

    const summary = await LedgerRepository.getPolicyLedgerSummary(id);
    if (!summary) {
      return {
        policy_id: policy.id,
        policy_number: policy.policy_number,
        total_premium: Number(policy.total_premium),
        total_paid: 0.0,
        outstanding: Number(policy.total_premium)
      };
    }

    return {
      policy_id: summary.policy_id,
      policy_number: summary.policy_number,
      total_premium: Number(summary.total_premium),
      total_paid: Number(summary.total_paid),
      outstanding: Number(summary.outstanding)
    };
  }
}

module.exports = PolicyService;
