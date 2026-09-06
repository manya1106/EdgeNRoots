const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const createPaymentSchema = Joi.object({
  policy_id: Joi.number().integer().positive().required().messages({
    'number.base': 'policy_id must be a number',
    'number.integer': 'policy_id must be an integer',
    'number.positive': 'policy_id must be positive',
    'any.required': 'policy_id is required'
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'amount must be a numeric value',
    'number.positive': 'amount must be greater than 0',
    'any.required': 'amount is required'
  })
});

const reversePaymentSchema = Joi.object({
  reversal_of_payment_id: Joi.number().integer().positive().required().messages({
    'number.base': 'reversal_of_payment_id must be a number',
    'number.integer': 'reversal_of_payment_id must be an integer',
    'number.positive': 'reversal_of_payment_id must be positive',
    'any.required': 'reversal_of_payment_id is required'
  }),
  reason: Joi.string().trim().max(255).optional()
});

function validateCreatePayment(data) {
  const { error, value } = createPaymentSchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message);
    throw new ValidationError(details[0], details);
  }
  return value;
}

function validateReversePayment(data) {
  const { error, value } = reversePaymentSchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message);
    throw new ValidationError(details[0], details);
  }
  return value;
}

module.exports = {
  validateCreatePayment,
  validateReversePayment
};
