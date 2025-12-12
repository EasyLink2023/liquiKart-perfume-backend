import { validationResult } from "express-validator";
import paypalPaymentService from "../services/paypal-payment.js";

/**
 * Create PayPal order
 */
const createPayPalOrder = async (req, res) => {
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

        const result = await paypalPaymentService.createPaymentOrder(
            cartId,
            shippingAddressId,
            billingAddressId,
            deliveryMethod,
            notes,
            req.user.id
        );

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Capture PayPal order and complete payment
 */
const capturePayPalOrder = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { orderId, paypalOrderId } = req.body;

        const result = await paypalPaymentService.capturePayPalOrderAndCreateOrder(
            orderId,
            paypalOrderId,
            req.user.id
        );

        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get PayPal order status
 */
const getPayPalOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const result = await paypalPaymentService.getPayPalOrderStatus(orderId);

        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Refund PayPal payment
 */
const refundPayPalPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { captureId, amount, reason } = req.body;

        const result = await paypalPaymentService.refundPayment(
            orderId,
            captureId,
            amount,
            reason
        );

        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Handle PayPal webhook
 */
const handlePayPalWebhook = async (req, res) => {
    try {
        const result = await paypalPaymentService.handleWebhook(req);
        res.status(200).json(result);
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(200).json({
            success: false,
            message: 'Webhook received but could not process'
        });
    }
};

export {
    createPayPalOrder,
    capturePayPalOrder,
    getPayPalOrderStatus,
    handlePayPalWebhook,
    refundPayPalPayment
};