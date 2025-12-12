
import { body } from 'express-validator';
import { User, Profile } from '../models/index.js';

export const validateLoginInput = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

export const validateSignupInput = [
  body('firstname')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .escape(),

  body('lastname')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('Email already registered!. Use another email');
      }
      return true;
    }),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone('any').withMessage('Invalid phone number format')
    .custom(async (phone) => {
      const existingProfile = await Profile.findOne({ where: { phone } });
      if (existingProfile) {
        throw new Error('Phone number already registered!. Use another phone number');
      }
      return true;
    }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character')
    .custom((password, { req }) => {
      if (password.includes(' ')) {
        throw new Error('Password cannot contain spaces');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((confirmPassword, { req }) => {
      if (confirmPassword !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((dateOfBirth) => {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        if (age - 1 < 13) {
          throw new Error('You must be at least 13 years old');
        }
      } else {
        if (age < 13) {
          throw new Error('You must be at least 13 years old');
        }
      }

      if (age > 120) {
        throw new Error('Please enter a valid date of birth');
      }

      return true;
    }),

  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['male', 'female', 'non-binary', 'other', 'prefer-not-to-say']).withMessage('Invalid gender selection'),

  body('agreeToTerms')
    .equals('true').withMessage('You must agree to the terms and conditions'),

  body('subscribe')
    .optional()
    .isBoolean().withMessage('Subscribe must be a boolean value'),

  body('role')
    .optional()
    .isIn(['CUSTOMER', 'VENDOR', 'ADMIN']).withMessage('Invalid role')
];

export const validateEmailVerification = [
  body('token')
    .notEmpty().withMessage('Verification token is required')
    .isJWT().withMessage('Invalid token format')
];

export const validatePasswordReset = [
  body('token')
    .notEmpty().withMessage('Reset token is required')
    .isJWT().withMessage('Invalid token format'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character')
];