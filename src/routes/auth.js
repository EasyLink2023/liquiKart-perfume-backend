import express from 'express';
const router = express.Router();

// Import controllers
import { login, signup } from '../controllers/auth.js';
import { verifyEmail, resendVerificationEmail } from '../controllers/verify.js';
import { forgotPassword, validateToken, resetPassword } from '../controllers/password.js';

// Import validations
import { validateLoginInput, validateSignupInput } from '../validators/auth.js';
import { validateResendVerification, validateVerifyEmail } from '../validators/verify.js';

import {
    validateForgotPassword,
    validateResetPassword,
    validateResetToken
} from '../validators/password.js';

// Auth routes
router.post('/login', validateLoginInput, login);
router.post('/register', validateSignupInput, signup);
router.get('/verify-email', validateVerifyEmail, verifyEmail);
router.post('/resend-verification', validateResendVerification, resendVerificationEmail);

// Password routes
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);
router.get('/validate-reset-token', validateResetToken, validateToken);

export default router;