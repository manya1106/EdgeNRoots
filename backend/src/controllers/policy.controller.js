const PolicyService = require('../services/policy.service');
const { successResponse } = require('../utils/response');

class PolicyController {
  static async createPolicy(req, res, next) {
    try {
      const policy = await PolicyService.createPolicy(req.body);
      return successResponse(res, policy, 'Policy created and booked successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getPolicyById(req, res, next) {
    try {
      const policyId = parseInt(req.params.id, 10);
      const policy = await PolicyService.getPolicyById(policyId);
      return successResponse(res, policy, 'Policy retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPolicyLedger(req, res, next) {
    try {
      const policyId = parseInt(req.params.id, 10);
      const ledger = await PolicyService.getPolicyLedger(policyId);
      return successResponse(res, ledger, 'Policy ledger entries retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPolicySummary(req, res, next) {
    try {
      const policyId = parseInt(req.params.id, 10);
      const summary = await PolicyService.getPolicySummary(policyId);
      return successResponse(res, summary, 'Policy summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PolicyController;
