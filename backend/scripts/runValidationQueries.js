const pool = require('../src/db/connection');
const LedgerRepository = require('../src/repositories/ledger.repository');

async function runValidationQueries() {
  console.log('=====================================================');
  console.log(' RUNNING AUDIT & ACCOUNTING INTEGRITY VALIDATION');
  console.log('=====================================================\n');

  try {
    // 1. Every transaction must balance
    console.log('Checking Query 1: Every transaction must balance (SUM(debit) == SUM(credit))...');
    const unbalanced = await LedgerRepository.getUnbalancedTransactions();
    if (unbalanced.length === 0) {
      console.log(' [PASS] All ledger transactions are strictly balanced (0 unbalanced rows).\n');
    } else {
      console.error(` [FAIL] Found ${unbalanced.length} unbalanced transactions:`);
      console.table(unbalanced);
    }

    // 2. No orphaned ledger entries
    console.log('Checking Query 2: No orphaned ledger entries...');
    const orphaned = await LedgerRepository.getOrphanedLedgerEntries();
    if (orphaned.length === 0) {
      console.log(' [PASS] Zero orphaned ledger entries found (0 rows).\n');
    } else {
      console.error(` [FAIL] Found ${orphaned.length} orphaned ledger entries:`);
      console.table(orphaned);
    }

    // 3. Outstanding never goes negative
    console.log('Checking Query 3: Outstanding balance never negative (Paid <= Total Premium)...');
    const negative = await LedgerRepository.getNegativeOutstandingPolicies();
    if (negative.length === 0) {
      console.log(' [PASS] No policy has a negative outstanding balance (0 overpaid rows).\n');
    } else {
      console.error(` [FAIL] Found ${negative.length} overpaid policies:`);
      console.table(negative);
    }

    // 4. Trial balance across entire ledger
    console.log('Checking Query 4: Grand trial balance (Total Debits == Total Credits)...');
    const trialBalance = await LedgerRepository.getTrialBalance();
    const isBalanced = Math.abs(trialBalance.total_debit - trialBalance.total_credit) < 0.001;
    console.log(`Total Debit:  ${trialBalance.total_debit.toFixed(2)}`);
    console.log(`Total Credit: ${trialBalance.total_credit.toFixed(2)}`);
    if (isBalanced) {
      console.log(' [PASS] General ledger trial balance holds true (Debits == Credits).\n');
    } else {
      console.error(` [FAIL] Trial balance mismatch! Difference: ${Math.abs(trialBalance.total_debit - trialBalance.total_credit)}\n`);
    }

    const allPassed =
      unbalanced.length === 0 &&
      orphaned.length === 0 &&
      negative.length === 0 &&
      isBalanced;

    console.log('=====================================================');
    console.log(` AUDIT SUMMARY: ${allPassed ? 'ALL INTEGRITY CHECKS PASSED ' : 'INTEGRITY FAILURES DETECTED '}`);
    console.log('=====================================================');

    return allPassed;
  } catch (error) {
    console.error('Error running validation queries:', error);
    return false;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runValidationQueries().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runValidationQueries;
