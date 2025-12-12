import Stripe from 'stripe';
import sequelize from "../config/database.js";
import {
    Order,
    OrderItem,
    Payment,
    Product,
    Cart,
    CartItem,
    Address,
    User,
    Profile
} from "../models/index.js";
import { generateOrderNumber } from '../utils/orderHelper.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const stripePaymentService = {

    /**
     * Create payment order
     */
    createPaymentOrder: async (
        cartId,
        shippingAddressId,
        billingAddressId,
        deliveryMethod,
        notes,
        userId
    ) => {
        const transaction = await sequelize.transaction();

        try {
            // 1. Get cart with items and products
            const cart = await Cart.findOne({
                where: { id: cartId, user_id: userId },
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

            // 2. Get addresses
            const shippingAddress = await Address.findOne({
                where: { id: shippingAddressId, user_id: userId },
                transaction
            });

            const billingAddress = await Address.findOne({
                where: { id: billingAddressId, user_id: userId },
                transaction
            });

            if (!shippingAddress || !billingAddress) {
                throw new Error('Address not found');
            }

            // 3. Validate stock and calculate total
            let subtotal = 0;
            const cartItems = [];

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

                const itemTotal = product.online_price * cartItem.quantity;
                subtotal += itemTotal;

                cartItems.push({
                    product_id: product.id,
                    quantity: cartItem.quantity,
                    unit_price: product.online_price,
                    product_name: product.name
                });
            }

            // 4. Calculate totals
            const taxRate = 0.08; // 8%
            const taxAmount = 0; //subtotal * taxRate;
            const shippingCost = 0; //deliveryMethod === 'delivery' ? 9.99 : 0;
            const totalAmount = subtotal + taxAmount + shippingCost;
            const orderNumber = await generateOrderNumber();

            // 5. Create order with pending status
            const order = await Order.create({
                user_id: userId,
                order_number: orderNumber,
                status: 'pending',
                payment_status: 'pending',
                payment_method: 'stripe',
                shipping_address: {
                    line1: shippingAddress.line1,
                    line2: shippingAddress.line2,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    postal_code: shippingAddress.postal_code,
                    country: shippingAddress.country,
                    phone: shippingAddress.phone
                },
                billing_address: {
                    line1: billingAddress.line1,
                    line2: billingAddress.line2,
                    city: billingAddress.city,
                    state: billingAddress.state,
                    postal_code: billingAddress.postal_code,
                    country: billingAddress.country,
                    phone: billingAddress.phone
                },
                subtotal: subtotal,
                tax_amount: taxAmount,
                shipping_cost: shippingCost,
                total_amount: totalAmount,
                currency: 'USD',
                notes: notes
            }, { transaction });

            // 6. Create order items
            const orderItemsData = cart.cart_items.map(cartItem => ({
                order_id: order.id,
                product_id: cartItem.product_id,
                quantity: cartItem.quantity,
                unit_price: cartItem.product.online_price,
                total_price: (cartItem.product.online_price * cartItem.quantity)
            }));

            await OrderItem.bulkCreate(orderItemsData, { transaction });

            // 7. Create payment record
            const payment = await Payment.create({
                order_id: order.id,
                payment_method: 'stripe',
                amount: totalAmount,
                currency: 'USD',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date()
            }, { transaction });

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
                message: "Order created successfully"
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Order creation failed: ${error.message}`);
        }
    },

    /**
     * Confirm payment
     */
    confirmPayment: async (orderId, paymentMethodId, returnUrl, userId) => {
        const transaction = await sequelize.transaction();

        try {
            // 1. Get order with items
            const order = await Order.findOne({
                where: { id: orderId, user_id: userId },
                include: [{
                    model: OrderItem,
                    as: 'items'
                }],
                transaction
            });

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.payment_status !== 'pending') {
                throw new Error('Order payment already processed');
            }

            // 2. Get user info for Stripe customer
            const user = await User.findByPk(userId, {
                include: [{
                    model: Profile,
                    as: 'profile'
                }],
                transaction
            });

            if (!user) {
                throw new Error('User not found');
            }

            // 3. Create or retrieve Stripe customer
            let customer;
            const existingCustomers = await stripe.customers.list({
                email: user.email,
                limit: 1
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: user.email,
                    name: `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim(),
                    phone: user.profile?.phone,
                    metadata: {
                        user_id: userId
                    }
                });
            }

            // 4. Create payment intent with automatic confirmation
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(order.total_amount * 100),
                currency: 'usd',
                customer: customer.id,
                payment_method: paymentMethodId,
                confirm: true,
                confirmation_method: 'automatic',
                capture_method: 'automatic',
                return_url: returnUrl,
                metadata: {
                    order_id: order.id,
                    order_number: order.order_number,
                    user_id: userId
                },
                description: `Order #${order.order_number}`,
                use_stripe_sdk: true,
            });

            // 5. Update payment record with payment intent ID
            await Payment.update(
                {
                    payment_intent_id: paymentIntent.id,
                    gateway_response: paymentIntent
                },
                {
                    where: { order_id: orderId },
                    transaction
                }
            );

            // 6. Handle payment intent status
            if (paymentIntent.status === 'succeeded') {
                // Regular card - payment succeeded immediately
                await stripePaymentService.completeOrderPayment(orderId, transaction);

                await transaction.commit();

                return {
                    success: true,
                    data: {
                        orderId: order.id,
                        status: 'succeeded',
                        paymentIntentId: paymentIntent.id
                    },
                    message: "Payment completed successfully"
                };

            } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
                // 3D Secure required - return client secret for frontend authentication
                await transaction.commit();

                return {
                    success: true,
                    data: {
                        orderId: order.id,
                        status: 'requires_action',
                        paymentIntentId: paymentIntent.id,
                        clientSecret: paymentIntent.client_secret
                    },
                    message: "3D Secure authentication required"
                };

            } else if (paymentIntent.status === 'processing') {
                // Payment processing
                await Order.update(
                    { payment_status: 'processing' },
                    { where: { id: orderId }, transaction }
                );

                await transaction.commit();

                return {
                    success: true,
                    data: {
                        orderId: order.id,
                        status: 'processing',
                        paymentIntentId: paymentIntent.id
                    },
                    message: "Payment is processing"
                };

            } else {
                throw new Error(`Payment failed with status: ${paymentIntent.status}`);
            }

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Payment confirmation failed: ${error.message}`);
        }
    },

    /**
     * Handle 3D Secure action after frontend authentication
     */
    handle3DSecureAction: async (orderId, paymentIntentId, userId) => {
        const transaction = await sequelize.transaction();

        try {
            // 1. Verify order belongs to user
            const order = await Order.findOne({
                where: { id: orderId, user_id: userId },
                transaction
            });

            if (!order) {
                throw new Error('Order not found');
            }

            // 2. Retrieve the payment intent to check its status after 3D Secure
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            // 3. Check if payment succeeded after 3D Secure authentication
            if (paymentIntent.status === 'succeeded') {
                // 3D Secure authentication successful - complete the order
                await stripePaymentService.completeOrderPayment(orderId, transaction);

                await transaction.commit();

                return {
                    success: true,
                    data: {
                        orderId: order.id,
                        status: 'succeeded',
                        paymentIntentId: paymentIntent.id
                    },
                    message: "3D Secure authentication completed successfully"
                };
            }

            // 4. Handle other statuses
            if (paymentIntent.status === 'processing') {
                await Order.update(
                    { payment_status: 'processing' },
                    { where: { id: orderId }, transaction }
                );

                await transaction.commit();

                return {
                    success: true,
                    data: {
                        orderId: order.id,
                        status: 'processing',
                        paymentIntentId: paymentIntent.id
                    },
                    message: "Payment is processing after 3D Secure"
                };
            }

            if (paymentIntent.status === 'requires_action') {
                // Payment still requires action - wait for webhook or retry
                await transaction.commit();

                return {
                    success: true,
                    data: {
                        orderId: order.id,
                        status: 'requires_action',
                        paymentIntentId: paymentIntent.id,
                        clientSecret: paymentIntent.client_secret
                    },
                    message: "3D Secure authentication still in progress"
                };
            }

            throw new Error(`3D Secure authentication failed. Status: ${paymentIntent.status}`);

        } catch (error) {
            await transaction.rollback();
            throw new Error(`3D Secure processing failed: ${error.message}`);
        }
    },

    /**
     * Complete order payment (update status, inventory, clear cart)
     */
    completeOrderPayment: async (orderId, transaction) => {
        try {
            // 1. Get order with items
            const order = await Order.findOne({
                where: { id: orderId },
                include: [{
                    model: OrderItem,
                    as: 'items'
                }],
                transaction
            });

            // 2. Update product quantities
            for (const orderItem of order.items) {
                await Product.decrement('quantity', {
                    by: orderItem.quantity,
                    where: { id: orderItem.product_id },
                    transaction
                });
            }

            // 3. Update order status
            await Order.update(
                {
                    status: 'confirmed',
                    payment_status: 'paid'
                },
                {
                    where: { id: orderId },
                    transaction
                }
            );

            // 4. Update payment status
            await Payment.update(
                {
                    status: 'succeeded'
                },
                {
                    where: { order_id: orderId },
                    transaction
                }
            );

            // 5. Clear user's cart
            const cart = await Cart.findOne({
                where: { user_id: order.user_id },
                transaction
            });

            if (cart) {
                await CartItem.destroy({
                    where: { cart_id: cart.id },
                    transaction
                });
            }

        } catch (error) {
            throw new Error(`Order completion failed: ${error.message}`);
        }
    },

    /**
     * Get payment status
     */
    getPaymentStatus: async (paymentIntentId) => {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            return {
                success: true,
                data: {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency
                }
            };
        } catch (error) {
            throw new Error(`Failed to retrieve payment status: ${error.message}`);
        }
    },

    /**
     * Handle Stripe webhook for async payment updates
     */
    handleWebhook: async (req) => {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            throw new Error(`Webhook signature verification failed: ${err.message}`);
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const orderId = paymentIntent.metadata.order_id;

            if (orderId) {
                // Complete the order payment
                await stripePaymentService.completeOrderPayment(orderId);
            }
        } else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            const orderId = paymentIntent.metadata.order_id;

            if (orderId) {
                // Update order and payment status to failed
                await Order.update(
                    { payment_status: 'failed', status: 'cancelled' },
                    { where: { id: orderId } }
                );

                await Payment.update(
                    { status: 'failed' },
                    { where: { payment_intent_id: paymentIntent.id } }
                );
            }
        }

        return { received: true };
    }
};

export default stripePaymentService;