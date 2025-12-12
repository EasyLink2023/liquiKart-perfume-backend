import { body } from 'express-validator';

export const createPaymentOrderValidation = [
    body('cartId')
        .isInt({ min: 1 })
        .withMessage('Valid cart ID is required'),
    body('shippingAddressId')
        .isInt({ min: 1 })
        .withMessage('Valid shipping address ID is required'),
    body('billingAddressId')
        .isInt({ min: 1 })
        .withMessage('Valid billing address ID is required'),
    body('deliveryMethod')
        .isIn(['pickup', 'delivery'])
        .withMessage('Delivery method must be pickup or delivery')
];

export const confirmPaymentValidation = [
    body('orderId')
        .isInt({ min: 1 })
        .withMessage('Valid order ID is required'),
    body('paymentMethodId')
        .notEmpty()
        .withMessage('Payment method ID is required'),
    body('returnUrl')
        .isString()
        .withMessage('Valid return URL is required')
];

export const handle3DSecureValidation = [
    body('orderId')
        .isInt({ min: 1 })
        .withMessage('Valid order ID is required'),
    body('paymentIntentId')
        .notEmpty()
        .withMessage('Payment intent ID is required'),
];