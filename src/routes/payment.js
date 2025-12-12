import express from 'express';

import {
    createPaymentOrderValidation,
    confirmPaymentValidation,
    handle3DSecureValidation
} from '../validators/stripePayment.js';

import {
    createPayPalOrderValidation,
    capturePayPalOrderValidation
} from '../validators/paypalPayment.js';

import {
    createPaymentOrder,
    confirmPayment,
    handle3DSecureAction,
    getPaymentStatus,
    handleWebhook
} from '../controllers/stripe-payment.js';

import {
    createPayPalOrder,
    capturePayPalOrder,
    getPayPalOrderStatus,
    handlePayPalWebhook,
    refundPayPalPayment
} from '../controllers/paypal-payment.js';

const router = express.Router();

// Stripe routes
router.post('/stripe/create-order', createPaymentOrderValidation, createPaymentOrder);
router.post('/stripe/confirm', confirmPaymentValidation, confirmPayment);
router.post('/stripe/handle-3d-secure', handle3DSecureValidation, handle3DSecureAction);
router.get('/stripe/status/:paymentIntentId', getPaymentStatus);
router.post('/stripe/webhook', handleWebhook);

// PayPal routes
router.post('/paypal/create-order', createPayPalOrderValidation, createPayPalOrder);
router.post('/paypal/capture-order', capturePayPalOrderValidation, capturePayPalOrder);
router.get('/paypal/status/:orderId', getPayPalOrderStatus);
router.post('/paypal/refund/:orderId', refundPayPalPayment);
router.post('/paypal/webhook', handlePayPalWebhook);

export default router;