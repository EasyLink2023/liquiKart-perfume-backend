import { validationResult } from 'express-validator';
import orderService from '../services/order.js';

/**
 * Create a new order
 */
const createOrder = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const orderData = {
            ...req.body,
            user_id: req.user.id
        };

        const result = await orderService.createOrder(orderData);

        res.status(201).json(result);
    } catch (error) {
        console.error('Create order error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get orders with filtering and pagination (for admin)
 */
const getOrders = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            status: req.query.status,
            payment_status: req.query.payment_status,
            sortBy: req.query.sortBy || 'created_at',
            sortOrder: req.query.sortOrder || 'desc'
        };

        const result = await orderService.getOrders(filters);

        res.status(200).json(result);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get orders for current user
 */
const getUserOrders = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            status: req.query.status,
            payment_status: req.query.payment_status,
            sortBy: req.query.sortBy || 'created_at',
            sortOrder: req.query.sortOrder || 'desc'
        };

        const result = await orderService.getUserOrders(req.user.id, filters);

        res.status(200).json(result);
    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const result = await orderService.getOrderById(parseInt(id), userId, userRole);

        res.status(200).json(result);
    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        const result = await orderService.updateOrderStatus(parseInt(id), status);

        res.status(200).json(result);
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Update payment status
 */
const updatePaymentStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { payment_status } = req.body;

        const result = await orderService.updatePaymentStatus(parseInt(id), payment_status);

        res.status(200).json(result);
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancel order
 */
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const reason = req.body.reason || '';

        const result = await orderService.cancelOrder(parseInt(id), userId, userRole, reason);

        res.status(200).json(result);
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export {
    createOrder,
    getOrders,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder
};