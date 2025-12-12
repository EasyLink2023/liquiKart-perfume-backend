import { body } from 'express-validator';

export const createPayPalOrderValidation = [
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

export const capturePayPalOrderValidation = [
    body('orderId')
        .isInt({ min: 1 })
        .withMessage('Valid order ID is required'),
    body('paypalOrderId')
        .notEmpty()
        .withMessage('PayPal order ID is required')
];