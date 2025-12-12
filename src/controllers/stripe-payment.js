import { validationResult } from "express-validator";
import stripePaymentService from "../services/stripe-payment.js";

/**
 * Create payment order
 */
const createPaymentOrder = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            cartId,
            shippingAddressId,
            billingAddressId,
            deliveryMethod,
            notes
        } = req.body;

        const result = await stripePaymentService.createPaymentOrder(
            cartId,
            shippingAddressId,
            billingAddressId,
            deliveryMethod,
            notes,
            req.user.id
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Confirm payment
 */
const confirmPayment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { orderId, paymentMethodId, returnUrl } = req.body;

        const result = await stripePaymentService.confirmPayment(
            orderId,
            paymentMethodId,
            returnUrl,
            req.user.id
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle 3D Secure action
 */
const handle3DSecureAction = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { orderId, paymentIntentId } = req.body;

        const result = await stripePaymentService.handle3DSecureAction(
            orderId,
            paymentIntentId,
            req.user.id
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('3D Secure action error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get payment status
 */
const getPaymentStatus = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const result = await stripePaymentService.getPaymentStatus(paymentIntentId);

        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle Stripe webhook
 */
const handleWebhook = async (req, res) => {
    try {
        const result = await stripePaymentService.handleWebhook(req);

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

export {
    createPaymentOrder,
    confirmPayment,
    handle3DSecureAction,
    getPaymentStatus,
    handleWebhook
};