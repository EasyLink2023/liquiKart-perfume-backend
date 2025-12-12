import jwt from 'jsonwebtoken';

import { User } from "../models/index.js";

import sendResponse from "../utils/responseHelper.js";
import { sendVerificationEmail } from "../utils/mailer.js";

/**
 * Verify email from token
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return sendResponse(res, {
      status: 400,
      message: 'Verification token is missing',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id?.data?.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        message: 'User not found',
      });
    }

    if (user.is_verified) {
      return sendResponse(res, {
        status: 200,
        message: 'Email is already verified',
      });
    }

    await user.update({ is_verified: true });

    return sendResponse(res, {
      status: 200,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    return sendResponse(res, {
      status: 400,
      message: 'Invalid or expired verification token',
      data: err.message,
    });
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return sendResponse(res, {
        status: 404,
        message: 'User not found with this email address',
      });
    }

    if (user.is_verified) {
      return sendResponse(res, {
        status: 400,
        message: 'Email is already verified',
      });
    }

    // Generate new verification token
    const token = jwt.sign(
      {
        id: { data: { id: user.id } },
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    // Send verification email
    await sendVerificationEmail(user.email, verifyUrl);

    return sendResponse(res, {
      status: 200,
      message: 'Verification email sent successfully. Please check your inbox.',
    });
  } catch (err) {

    console.error('Resend verification error:', err);
    return sendResponse(res, {
      status: 500,
      message: 'Failed to send verification email. Please try again.',
      data: err.message,
    });

  }

};