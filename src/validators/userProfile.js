import { body, param, validationResult } from 'express-validator';
import sendResponse from '../utils/responseHelper.js';

// Validation error handler middleware
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendResponse(res, {
            status: 400,
            message: 'Validation failed',
            data: errors.array(),
        });
    }
    next();
};

// User profile validation rules
export const validateUserProfile = [
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),

    body('profile.first_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),

    body('profile.last_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),

    body('profile.date_of_birth')
        .optional()
        .isISO8601()
        .withMessage('Date of birth must be a valid date'),

    body('profile.gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
        .withMessage('Gender must be one of: male, female, other, prefer_not_to_say'),

    body('profile.phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),

    handleValidationErrors,
];

// Profile image upload validation
export const validateProfileImage = [
    body('url')
        .isString()
        .withMessage('Please provide a valid URL for the profile image'),

    handleValidationErrors,
];

// Avatar update validation
export const validateAvatarUpdate = [
    body('avatar_url')
        .isString()
        .withMessage('Please provide a valid avatar URL'),

    handleValidationErrors,
];