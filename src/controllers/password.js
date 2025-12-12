import { validationResult } from "express-validator";
import { passwordService } from "../services/password.js";
import sendResponse from "../utils/responseHelper.js";
import { sendPasswordResetEmail } from '../utils/mailer.js';

/**
 * @desc Forgot password - generate reset token and send email
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const result = await passwordService.initiatePasswordReset(email);

    if (result.status === 200 && result.data && process.env.CLIENT_URL) {
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${result.data.resetToken}`;
      await sendPasswordResetEmail(email, resetUrl);

      return sendResponse(res, {
        status: 200,
        message: 'Password reset link has been sent to your email'
      });
    }

    if (result.status === 404) {
      return sendResponse(res, {
        status: 404,
        message: 'No account found with this email address'
      });
    }

    // Other errors
    return sendResponse(res, {
      status: result.status,
      message: result.message
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'An error occurred while processing your request'
    });
  }
};

/**
 * @desc Reset password with token
 * @route POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    const result = await passwordService.completePasswordReset(token, password);

    return sendResponse(res, {
      status: result.status,
      message: result.message
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'An error occurred while resetting your password'
    });
  }
};

/**
 * @desc Validate reset token
 * @route GET /api/auth/validate-reset-token
 */
export const validateToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return sendResponse(res, {
        status: 400,
        message: 'Reset token is required'
      });
    }

    const result = await passwordService.validateResetToken(token);

    return sendResponse(res, {
      status: result.status,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.error('Validate token error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'An error occurred while validating the reset token'
    });
  }
};