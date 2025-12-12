import { body, param, query } from 'express-validator';

export const createOrderValidation = [
    body('cart_id')
        .isInt({ min: 1 })
        .withMessage('Valid cart ID is required'),
    body('address_id')
        .isInt({ min: 1 })
        .withMessage('Valid shipping address ID is required'),
    body('delivery_method')
        .isIn(['pickup', 'delivery'])
        .withMessage('Delivery method must be pickup or delivery')
];

export const updateOrderStatusValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Order ID must be a positive integer'),

    body('status')
        .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
        .withMessage('Invalid order status')
];

export const updatePaymentStatusValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Order ID must be a positive integer'),

    body('payment_status')
        .isIn(['pending', 'paid', 'failed', 'refunded', 'cancelled'])
        .withMessage('Invalid payment status')
];

export const getOrdersValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
        .withMessage('Invalid status filter'),

    query('payment_status')
        .optional()
        .isIn(['pending', 'paid', 'failed', 'refunded', 'cancelled'])
        .withMessage('Invalid payment status filter'),

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'created_at', 'total_amount', 'status'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
];

export const getOrderByIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Order ID must be a positive integer')
];