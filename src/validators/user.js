import { body } from "express-validator";

const createUserValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('role')
        .isIn(['CUSTOMER', 'VENDOR', 'ADMIN'])
        .default('CUSTOMER'),
    body('first_name')
        .notEmpty()
        .trim()
        .withMessage('First name is required'),
    body('last_name')
        .notEmpty()
        .trim()
        .withMessage('Last name is required'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('avatar_url')
        .optional()
        .isURL()
        .withMessage('Please provide a valid URL for avatar'),
    body('company_name')
        .optional()
        .trim(),
    body('tax_id')
        .optional()
        .trim(),
    body('commission_rate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Commission rate must be between 0 and 100'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
    body('is_verified')
        .optional()
        .isBoolean()
        .withMessage('is_verified must be a boolean')
];

const updateUserValidation = [
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('role')
        .optional()
        .isIn(['CUSTOMER', 'VENDOR', 'ADMIN'])
        .withMessage('Role must be CUSTOMER, VENDOR, or ADMIN'),
    body('first_name')
        .optional()
        .notEmpty()
        .trim()
        .withMessage('First name cannot be empty'),
    body('last_name')
        .optional()
        .notEmpty()
        .trim()
        .withMessage('Last name cannot be empty'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('avatar_url')
        .optional()
        .isURL()
        .withMessage('Please provide a valid URL for avatar'),
    body('company_name')
        .optional()
        .trim(),
    body('tax_id')
        .optional()
        .trim(),
    body('commission_rate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Commission rate must be between 0 and 100'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
    body('is_verified')
        .optional()
        .isBoolean()
        .withMessage('is_verified must be a boolean')
];

export {
    createUserValidation,
    updateUserValidation
}