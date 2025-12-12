import express from 'express';
import {
    createOrderValidation,
    updateOrderStatusValidation,
    updatePaymentStatusValidation,
    getOrdersValidation
} from '../validators/order.js';

import {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder,
    getUserOrders
} from '../controllers/order.js';

const router = express.Router();

// Order routes
router.post('/', createOrderValidation, createOrder);
router.get('/', getOrdersValidation, getOrders);
router.get('/user', getOrdersValidation, getUserOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatusValidation, updateOrderStatus);
router.patch('/:id/payment-status', updatePaymentStatusValidation, updatePaymentStatus);
router.patch('/:id/cancel', cancelOrder);

export default router;