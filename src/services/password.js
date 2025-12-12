import crypto from 'crypto';
import { Op } from 'sequelize';
import User from "../models/User.js";

export const passwordService = {
    // Forgot password - generate and send reset token
    initiatePasswordReset: async (email) => {
        try {
            const user = await User.findOne({ where: { email } });

            if (!user) {
                return {
                    status: 404,
                    message: 'No account found with this email address'
                };
            }

            // Check if user is active
            if (!user.is_active) {
                return {
                    status: 403,
                    message: 'This account has been deactivated. Please contact support.'
                };
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await user.update({
                reset_password_token: resetToken,
                reset_password_expires: resetTokenExpiry
            });

            return {
                status: 200,
                message: 'Password reset token generated successfully',
                data: {
                    resetToken,
                    resetTokenExpiry
                }
            };
        } catch (error) {
            console.error('Initiate password reset error:', error);
            return {
                status: 500,
                message: 'Failed to initiate password reset process'
            };
        }
    },

    // Complete password reset
    completePasswordReset: async (token, newPassword) => {
        try {
            const user = await User.findOne({
                where: {
                    reset_password_token: token,
                    reset_password_expires: {
                        [Op.gt]: new Date()
                    }
                }
            });

            if (!user) {
                return {
                    status: 400,
                    message: 'Invalid or expired reset token. Please request a new password reset link.'
                };
            }

            // Update password using the instance method to trigger hooks
            await user.updatePassword(newPassword);

            // Clear reset token
            await user.update({
                reset_password_token: null,
                reset_password_expires: null
            });

            return {
                status: 200,
                message: 'Password has been reset successfully. You can now log in with your new password.'
            };
        } catch (error) {
            console.error('Complete password reset error:', error);

            if (error.name === 'SequelizeValidationError') {
                return {
                    status: 400,
                    message: 'Password must be at least 6 characters long'
                };
            }

            return {
                status: 500,
                message: 'Failed to reset password. Please try again.'
            };
        }
    },

    validateResetToken: async (token) => {
        try {
            const user = await User.findOne({
                where: {
                    reset_password_token: token,
                    reset_password_expires: {
                        [Op.gt]: new Date()
                    }
                },
                attributes: ['id', 'email', 'is_active']
            });

            if (!user) {
                return {
                    status: 400,
                    message: 'Invalid or expired reset token',
                    data: { isValid: false }
                };
            }

            if (!user.is_active) {
                return {
                    status: 403,
                    message: 'This account has been deactivated',
                    data: { isValid: false }
                };
            }

            return {
                status: 200,
                message: 'Reset token is valid',
                data: {
                    isValid: true,
                    email: user.email
                }
            };
        } catch (error) {
            console.error('Validate reset token error:', error);
            return {
                status: 500,
                message: 'Failed to validate reset token',
                data: { isValid: false }
            };
        }
    }
};