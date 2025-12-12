import { body, param, query } from 'express-validator';

export const validateCreateAddress = [
    body('type')
        .optional()
        .isIn(['billing', 'shipping', 'office', 'other'])
        .withMessage('Type must be one of: billing, shipping, office, other'),

    body('full_name')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2, max: 255 })
        .withMessage('Full name must be between 2 and 255 characters'),

    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),

    body('line1')
        .trim()
        .notEmpty()
        .withMessage('Address line 1 is required')
        .isLength({ min: 5, max: 255 })
        .withMessage('Address line 1 must be between 5 and 255 characters'),

    body('line2')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Address line 2 must not exceed 255 characters'),

    body('city')
        .trim()
        .notEmpty()
        .withMessage('City is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be between 2 and 100 characters'),

    body('state')
        .trim()
        .notEmpty()
        .withMessage('State is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('State must be between 2 and 100 characters'),

    body('postal_code')
        .trim()
        .notEmpty()
        .withMessage('Postal code is required')
        .isLength({ min: 3, max: 20 })
        .withMessage('Postal code must be between 3 and 20 characters'),

    body('country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),

    body('is_default')
        .optional()
        .isBoolean()
        .withMessage('is_default must be a boolean')
];

export const validateUpdateAddress = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid address ID is required'),

    body('type')
        .optional()
        .isIn(['billing', 'shipping', 'office', 'other'])
        .withMessage('Type must be one of: billing, shipping, office, other'),

    body('full_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Full name must be between 2 and 255 characters'),

    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),

    body('line1')
        .optional()
        .trim()
        .isLength({ min: 5, max: 255 })
        .withMessage('Address line 1 must be between 5 and 255 characters'),

    body('line2')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Address line 2 must not exceed 255 characters'),

    body('city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be between 2 and 100 characters'),

    body('state')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('State must be between 2 and 100 characters'),

    body('postal_code')
        .optional()
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Postal code must be between 3 and 20 characters'),

    body('country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),

    body('is_default')
        .optional()
        .isBoolean()
        .withMessage('is_default must be a boolean')
];

export const validateAddressId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid address ID is required')
];

export const validateGetAddresses = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),

    query('includeInactive')
        .optional()
        .isBoolean()
        .withMessage('includeInactive must be a boolean'),

    query('type')
        .optional()
        .isIn(['billing', 'shipping', 'office', 'other'])
        .withMessage('Type must be one of: billing, shipping, office, other')
];