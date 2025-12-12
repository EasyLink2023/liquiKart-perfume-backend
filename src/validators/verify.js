import { query, body } from 'express-validator';

export const validateVerifyEmail = [
    query('token')
        .notEmpty()
        .withMessage('Verification token is required')
];


export const validateResendVerification = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
        .notEmpty()
        .withMessage('Email is required')
];