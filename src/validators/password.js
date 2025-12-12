import { body, query } from 'express-validator';

export const validateForgotPassword = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
        .isLength({ max: 255 })
        .withMessage('Email must be less than 255 characters')
];

export const validateResetPassword = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isLength({ min: 64, max: 64 })
        .withMessage('Invalid reset token format'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
        .isLength({ max: 255 })
        .withMessage('Password must be less than 255 characters')
];

export const validateResetToken = [
    query('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isLength({ min: 64, max: 64 })
        .withMessage('Invalid reset token format')
];