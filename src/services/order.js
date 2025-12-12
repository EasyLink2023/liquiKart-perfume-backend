import sequelize from "../config/database.js";
import { Address, Cart, CartItem, Order, OrderItem, Payment, Product, ProductImage, Profile, User } from "../models/index.js";
import { generateOrderNumber } from "../utils/orderHelper.js";
import { sendOrderStatusUpdateEmail } from "../utils/mailer.js";

const orderService = {

    /**
     * Create a new order
     */
    createOrder: async (orderData) => {
        const transaction = await sequelize.transaction();

        try {
            const {
                user_id,
                cart_id,
                address_id,
                payment_method = 'cash_on_delivery',
                notes
            } = orderData;

            if (!user_id) {
                throw new Error('User ID is required');
            }

            if (!cart_id) {
                throw new Error('Cart ID is required');
            }

            if (!address_id) {
                throw new Error('Address ID is required');
            }

            // 1. Get cart with items and products
            const cart = await Cart.findOne({
                where: { id: cart_id, user_id: user_id },
                include: [{
                    model: CartItem,
                    as: 'cart_items',
                    include: [{
                        model: Product,
                        as: 'product'
                    }]
                }],
                transaction
            });

            if (!cart) {
                throw new Error('Cart not found');
            }

            if (!cart.cart_items || cart.cart_items.length === 0) {
                throw new Error('Cart is empty');
            }

            // 2. Get address
            const address = await Address.findOne({
                where: { id: address_id, user_id: user_id },
                transaction
            });

            if (!address) {
                throw new Error('Address not found');
            }

            // 3. Prepare address object for order
            const addressObj = {
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                postal_code: address.postal_code,
                country: address.country,
                phone: address.phone
            };

            // 4. Validate stock and calculate totals
            let subtotal = 0;
            const orderItemsData = [];

            for (const cartItem of cart.cart_items) {
                const product = cartItem.product;

                if (!product) {
                    throw new Error(`Product not found for cart item ${cartItem.id}`);
                }

                if (product.status !== 'active') {
                    throw new Error(`Product "${product.name}" is not available`);
                }

                if (product.quantity < cartItem.quantity) {
                    throw new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${cartItem.quantity}`);
                }

                // Use online_price if available, otherwise use regular price
                const unit_price = product.online_price || product.price;
                const itemTotal = unit_price * cartItem.quantity;
                subtotal += itemTotal;

                orderItemsData.push({
                    product_id: product.id,
                    quantity: cartItem.quantity,
                    unit_price: unit_price,
                    total_price: itemTotal
                });
            }

            // 4. Calculate totals
            const taxRate = 0.08; // 8%
            const taxAmount = 0; //subtotal * taxRate;
            const shippingCost = 0; //deliveryMethod === 'delivery' ? 9.99 : 0;
            const totalAmount = subtotal + taxAmount + shippingCost;

            // 6. Generate order number
            const orderNumber = await generateOrderNumber();

            // 7. Create order with pending status (for cash on delivery)
            const order = await Order.create({
                user_id: user_id,
                order_number: orderNumber,
                status: 'pending', // Order is created but waiting for payment/delivery
                payment_status: 'pending', // Payment pending for cash on delivery
                payment_method: payment_method,
                shipping_address: addressObj,
                billing_address: addressObj, // Same as shipping address
                subtotal: subtotal,
                tax_amount: taxAmount,
                shipping_cost: shippingCost,
                total_amount: totalAmount,
                currency: 'USD',
                notes: notes
            }, { transaction });

            // 8. Create order items
            const orderItemsWithOrderId = orderItemsData.map(item => ({
                ...item,
                order_id: order.id
            }));

            await OrderItem.bulkCreate(orderItemsWithOrderId, { transaction });

            // 9. Update product quantities (reduce stock)
            for (const item of orderItemsData) {
                await Product.decrement('quantity', {
                    by: item.quantity,
                    where: { id: item.product_id },
                    transaction
                });
            }

            // 10. Create payment record for cash on delivery
            await Payment.create({
                order_id: order.id,
                payment_method: payment_method,
                amount: totalAmount,
                currency: 'USD',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date()
            }, { transaction });

            // 11. Clear the cart items after successful order creation
            await CartItem.destroy({
                where: { cart_id: cart_id },
                transaction
            });

            await transaction.commit();

            return {
                success: true,
                data: {
                    orderId: order.id,
                    orderNumber: order.order_number,
                    status: 'created',
                    amount: totalAmount,
                    currency: 'USD'
                },
                message: "Order created successfully for cash on delivery."
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Order creation failed: ${error.message}`);
        }
    },

    /**
     * Get orders with filtering and pagination (admin)
     */
    getOrders: async (filters = {}) => {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                payment_status,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = filters;

            const offset = (page - 1) * limit;

            const whereClause = {};
            if (status) whereClause.status = status;
            if (payment_status) whereClause.payment_status = payment_status;

            const { count, rows: orders } = await Order.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'item_lookup_code', 'description', 'size', 'price', 'online_price'],
                            include: [{
                                model: ProductImage,
                                as: 'images'
                            }]
                        }]
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['id', 'status', 'amount', 'payment_method']
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['email'],
                        include: [{
                            model: Profile,
                            as: 'profile',
                            attributes: ['first_name', 'last_name', 'avatar_url']
                        }]
                    }
                ],
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true
            });

            return {
                success: true,
                data: {
                    orders,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(count / limit),
                        totalItems: count,
                        itemsPerPage: parseInt(limit)
                    }
                }
            };

        } catch (error) {
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }
    },

    /**
     * Get orders for specific user
     */
    getUserOrders: async (userId, filters = {}) => {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                payment_status,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = filters;

            const offset = (page - 1) * limit;

            const whereClause = { user_id: userId };
            if (status) whereClause.status = status;
            if (payment_status) whereClause.payment_status = payment_status;

            const { count, rows: orders } = await Order.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'item_lookup_code', 'description', 'size', 'price', 'online_price']
                        }]
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        attributes: ['id', 'status', 'amount', 'payment_method']
                    }
                ],
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true
            });

            return {
                success: true,
                data: {
                    orders,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(count / limit),
                        totalItems: count,
                        itemsPerPage: parseInt(limit)
                    }
                }
            };

        } catch (error) {
            throw new Error(`Failed to fetch user orders: ${error.message}`);
        }
    },

    /**
     * Get order by ID
     */
    getOrderById: async (orderId, userId, userRole = 'customer') => {
        try {
            const whereClause = { id: orderId };

            // Non-admin users can only see their own orders
            if (userRole !== 'admin') {
                whereClause.user_id = userId;
            }

            const order = await Order.findOne({
                where: whereClause,
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'item_lookup_code', 'description', 'size', 'price', 'online_price', 'sale_price'],
                            include: [{
                                model: ProductImage,
                                as: 'images'
                            }]
                        }]
                    },
                    {
                        model: Payment,
                        as: 'payment'
                    }
                ]
            });

            if (!order) {
                throw new Error('Order not found');
            }

            return {
                success: true,
                data: order
            };

        } catch (error) {
            throw new Error(`Failed to fetch order: ${error.message}`);
        }
    },

    /**
     * Update order status
     */
    updateOrderStatus: async (orderId, status) => {
        const transaction = await sequelize.transaction();

        try {
            const order = await Order.findByPk(orderId, {
                transaction,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['email'],
                    include: [{
                        model: Profile, as: 'profile',
                        attributes: ['first_name', 'last_name'],
                    }]
                }]
            });

            if (!order) {
                throw new Error('Order not found');
            }

            const validTransitions = {
                pending: ['confirmed', 'cancelled'],
                confirmed: ['processing', 'cancelled'],
                processing: ['shipped', 'cancelled'],
                shipped: ['delivered'],
                delivered: ['refunded'],
                cancelled: [],
                refunded: []
            };
            console.log({ orderStatusDB: order.status, status })
            const allowedStatuses = validTransitions[order.status];
            if (!allowedStatuses || !allowedStatuses.includes(status)) {
                throw new Error(`Invalid status transition from ${order.status} to ${status}`);
            }

            await Order.update(
                { status },
                { where: { id: orderId }, transaction }
            );

            if (status === 'cancelled') {
                const orderItems = await OrderItem.findAll({
                    where: { order_id: orderId },
                    transaction
                });

                for (const item of orderItems) {
                    await Product.increment('quantity', {
                        by: item.quantity,
                        where: { id: item.product_id },
                        transaction
                    });
                }
            }

            if (status === 'delivered' && order.payment_status === 'pending') {
                await Order.update(
                    { payment_status: 'paid' },
                    { where: { id: orderId }, transaction }
                );

                await Payment.update(
                    { status: 'succeeded' },
                    { where: { order_id: orderId }, transaction }
                );
            }

            await transaction.commit();

            if (order.user && order.user.email) {
                try {
                    const orderDate = order.created_at
                        ? new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })
                        : new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });

                    const estimatedDate = new Date();
                    estimatedDate.setDate(estimatedDate.getDate() + 2);
                    const estimatedDelivery = estimatedDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });

                    const orderData = {
                        orderId: order.order_number || order.id,
                        customerName: `${order.user.profile?.first_name || ''} ${order.user.profile?.last_name || ''}`.trim() || 'Valued Customer',
                        status: status,
                        orderDate: orderDate,
                        trackingNumber: order.order_number || null,
                        estimatedDelivery: estimatedDelivery,
                        customMessage: "",
                        orderLink: `${process.env.FRONTEND_URL}/orders/${order.id}`
                    };

                    await sendOrderStatusUpdateEmail(order.user.email, orderData);
                } catch (emailError) {
                    console.error('Failed to send order status email:', emailError);
                }
            }

            return {
                success: true,
                message: `Order status updated to ${status}`,
                emailSent: !!(order.user && order.user.email)
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to update order status: ${error.message}`);
        }
    },

    /**
     * Update payment status
     */
    updatePaymentStatus: async (orderId, paymentStatus) => {
        const transaction = await sequelize.transaction();

        try {
            const order = await Order.findByPk(orderId, { transaction });

            if (!order) {
                throw new Error('Order not found');
            }

            await Order.update(
                { payment_status: paymentStatus },
                { where: { id: orderId }, transaction }
            );

            await Payment.update(
                { status: paymentStatus === 'paid' ? 'succeeded' : paymentStatus },
                { where: { order_id: orderId }, transaction }
            );

            // If payment is successful, update inventory and order status
            if (paymentStatus === 'paid') {
                const orderItems = await OrderItem.findAll({
                    where: { order_id: orderId },
                    transaction
                });

                for (const item of orderItems) {
                    await Product.decrement('quantity', {
                        by: item.quantity,
                        where: { id: item.product_id },
                        transaction
                    });
                }

                // Update order status to confirmed if it's still pending
                if (order.status === 'pending') {
                    await Order.update(
                        { status: 'confirmed' },
                        { where: { id: orderId }, transaction }
                    );
                }
            }

            // If payment failed and order was pending, cancel the order
            if (paymentStatus === 'failed' && order.status === 'pending') {
                await Order.update(
                    { status: 'cancelled' },
                    { where: { id: orderId }, transaction }
                );

                // Restore product quantities
                const orderItems = await OrderItem.findAll({
                    where: { order_id: orderId },
                    transaction
                });

                for (const item of orderItems) {
                    await Product.increment('quantity', {
                        by: item.quantity,
                        where: { id: item.product_id },
                        transaction
                    });
                }
            }

            await transaction.commit();

            return {
                success: true,
                message: `Payment status updated to ${paymentStatus}`
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to update payment status: ${error.message}`);
        }
    },

    cancelOrder: async (orderId, userId, userRole = 'customer', reason = '', notes = '') => {
        const transaction = await sequelize.transaction();

        try {
            const whereClause = { id: orderId };
            if (userRole !== 'admin') whereClause.user_id = userId;

            const order = await Order.findOne({ where: whereClause, transaction });

            if (!order) throw new Error('Order not found');

            // Check if order can be cancelled
            const cancellableStatuses = ['pending', 'confirmed', 'processing'];
            if (!cancellableStatuses.includes(order.status)) {
                throw new Error(`Order cannot be cancelled in ${order.status} status`);
            }

            await Order.update(
                {
                    status: 'cancelled',
                    cancellation_reason: reason,
                    cancellation_notes: notes,
                    cancelled_by: userRole === 'admin' ? 'admin' : 'customer',
                    cancelled_at: new Date()
                },
                { where: { id: orderId }, transaction }
            );

            // Restore product quantities
            const orderItems = await OrderItem.findAll({ where: { order_id: orderId }, transaction });

            for (const item of orderItems) {
                await Product.increment('quantity', {
                    by: item.quantity,
                    where: { id: item.product_id },
                    transaction
                });
            }

            await transaction.commit();

            return {
                success: true,
                message: 'Order cancelled successfully'
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to cancel order: ${error.message}`);
        }
    },

    /**
     * Get order statistics for dashboard
     */
    getOrderStatistics: async (userId = null, userRole = 'customer') => {
        try {
            const whereClause = {};
            if (userRole !== 'admin' && userId) {
                whereClause.user_id = userId;
            }

            const totalOrders = await Order.count({ where: whereClause });
            const pendingOrders = await Order.count({
                where: { ...whereClause, status: 'pending' }
            });
            const completedOrders = await Order.count({
                where: { ...whereClause, status: 'delivered' }
            });
            const totalRevenue = await Order.sum('total_amount', {
                where: { ...whereClause, payment_status: 'paid' }
            });

            // Recent orders
            const recentOrders = await Order.findAll({
                where: whereClause,
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'item_lookup_code']
                        }]
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: 5
            });

            return {
                success: true,
                data: {
                    statistics: {
                        totalOrders,
                        pendingOrders,
                        completedOrders,
                        totalRevenue: totalRevenue || 0
                    },
                    recentOrders
                }
            };

        } catch (error) {
            throw new Error(`Failed to fetch order statistics: ${error.message}`);
        }
    }
};

export default orderService;