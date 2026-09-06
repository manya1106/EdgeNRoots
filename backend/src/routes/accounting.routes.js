const express = require('express');
const LedgerRepository = require('../repositories/ledger.repository');
const { successResponse } = require('../utils/response');

const router = express.Router();

router.get('/validate', async (req, res, next) => {
  try {
    const [unbalanced, orphaned, negativeOutstanding, trialBalance] = await Promise.all([
      LedgerRepository.getUnbalancedTransactions(),
      LedgerRepository.getOrphanedLedgerEntries(),
      LedgerRepository.getNegativeOutstandingPolicies(),
      LedgerRepository.getTrialBalance()
    ]);

    const isHealthy =
      unbalanced.length === 0 &&
      orphaned.length === 0 &&
      negativeOutstanding.length === 0 &&
      Math.abs(trialBalance.total_debit - trialBalance.total_credit) < 0.001;

    return successResponse(res, {
      status: isHealthy ? 'HEALTHY' : 'CORRUPTED',
      checks: {
        unbalanced_transactions: {
          passed: unbalanced.length === 0,
          failed_count: unbalanced.length,
          rows: unbalanced
        },
        orphaned_ledger_entries: {
          passed: orphaned.length === 0,
          failed_count: orphaned.length,
          rows: orphaned
        },
        negative_outstanding_policies: {
          passed: negativeOutstanding.length === 0,
          failed_count: negativeOutstanding.length,
          rows: negativeOutstanding
        },
        trial_balance: {
          passed: Math.abs(trialBalance.total_debit - trialBalance.total_credit) < 0.001,
          total_debit: trialBalance.total_debit,
          total_credit: trialBalance.total_credit,
          difference: Math.abs(trialBalance.total_debit - trialBalance.total_credit)
        }
      }
    }, 'Accounting validation queries executed successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
