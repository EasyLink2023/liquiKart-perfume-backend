import sequelize from "../config/database.js";
import { Order, OrderItem, Payment, Product, Cart, CartItem, Address } from "../models/index.js";
import { generateOrderNumber } from "../utils/orderHelper.js";

class PayPalService {
    constructor() {
        this.environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

        this.clientId = process.env.PAYPAL_CLIENT_ID;
        this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        this.baseUrl = this.environment === 'live'
            ? 'https://api.paypal.com'
            : 'https://api.sandbox.paypal.com';

        this.frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        this.storeName = process.env.STORE_NAME || 'Planet of wine';

        if (!this.clientId || !this.clientSecret) {
            console.error('PayPal credentials not configured for', this.environment);
        }
    }

    /**
     * Get access token for PayPal API
     */
    async getAccessToken() {
        try {
            const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

            const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('PayPal auth error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`PayPal authentication failed: ${response.status}`);
            }

            const data = await response.json();
            return data.access_token;
        } catch (error) {
            console.error('PayPal access token error:', error);
            throw new Error(`Failed to get PayPal access token: ${error.message}`);
        }
    }

    /**
     * Make authenticated request to PayPal API
     */
    async makePayPalRequest(method, endpoint, data = null) {
        const accessToken = await this.getAccessToken();

        const config = {
            method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                'Prefer': 'return=representation',
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const responseData = await response.json();

            if (!response.ok) {
                console.error('PayPal API Error Details:', {
                    endpoint,
                    method,
                    status: response.status,
                    statusText: response.statusText,
                    requestData: data,
                    response: responseData,
                    environment: this.environment
                });

                const errorMessage = responseData.details?.[0]?.description ||
                    responseData.message ||
                    `PayPal API error: ${response.status}`;

                throw new Error(errorMessage);
            }

            return responseData;
        } catch (error) {
            console.error('PayPal request failed:', error);
            throw new Error(`PayPal API request failed: ${error.message}`);
        }
    }
}

const paypalService = new PayPalService();

const paypalPaymentService = {

    /**
     * Create PayPal order (creates order and PayPal order)
     */
    createPaymentOrder: async (cartId, shippingAddressId, billingAddressId, deliveryMethod, notes, userId) => {
        const transaction = await sequelize.transaction();

        try {
            // 1. Check if user already has a pending PayPal order for this cart
            const existingOrder = await Order.findOne({
                where: {
                    user_id: userId,
                    payment_status: 'pending',
                    payment_method: 'paypal'
                },
                include: [{
                    model: Payment,
                    as: 'payment',
                    where: {
                        status: 'pending'
                    }
                }],
                order: [['created_at', 'DESC']],
                transaction
            });

            if (existingOrder) {
                // Check if the existing order is recent (last 30 minutes)
                const orderAge = Date.now() - new Date(existingOrder.created_at).getTime();
                const thirtyMinutes = 30 * 60 * 1000;

                if (orderAge < thirtyMinutes) {
                    // Use existing order and update PayPal order if needed
                    const payment = await Payment.findOne({
                        where: { order_id: existingOrder.id },
                        transaction
                    });

                    if (payment && payment.paypal_order_id) {
                        try {
                            const paypalOrder = await paypalService.makePayPalRequest(
                                'GET',
                                `/v2/checkout/orders/${payment.paypal_order_id}`
                            );

                            if (paypalOrder.status === 'CREATED' || paypalOrder.status === 'APPROVED') {
                                await transaction.commit();

                                return {
                                    success: true,
                                    data: {
                                        orderId: existingOrder.id,
                                        orderNumber: existingOrder.order_number,
                                        paypalOrderId: payment.paypal_order_id,
                                        approvalUrl: paypalOrder.links.find(link => link.rel === 'approve')?.href,
                                        status: 'created',
                                        amount: existingOrder.total_amount,
                                        currency: 'USD'
                                    },
                                    message: "Order retrieved successfully"
                                };
                            }
                        } catch (error) {
                            console.log('Existing PayPal order invalid, creating new one');
                        }
                    }
                }
            }

            // 2. Get cart with items and products
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

            // 2. Get and validate addresses
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

            // 3. Validate stock and calculate amounts
            let subtotal = 0;
            const lineItems = [];

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

                const itemPrice = parseFloat(product.online_price);
                const itemTotal = itemPrice * cartItem.quantity;
                subtotal += itemTotal;

                lineItems.push({
                    name: product.name.substring(0, 127),
                    unit_amount: {
                        currency_code: 'USD',
                        value: itemPrice.toFixed(2)
                    },
                    quantity: cartItem.quantity.toString(),
                    sku: product.sku || `PROD-${product.id}`,
                    category: 'PHYSICAL_GOODS'
                });
            }

            subtotal = parseFloat(subtotal.toFixed(2));

            // 4. Calculate tax, shipping, and total
            const taxRate = 0.08; // 8% tax
            const taxAmount = 0; //parseFloat((subtotal * taxRate).toFixed(2));
            const shippingCost = 0; // deliveryMethod === 'delivery' ? 9.99 : 0;
            const totalAmount = parseFloat((subtotal + taxAmount + shippingCost).toFixed(2));

            // 5. Validate total amount
            if (totalAmount < 0.01) {
                throw new Error('Order total must be at least $0.01');
            }

            // 6. Create order
            const orderNumber = await generateOrderNumber();
            const order = await Order.create({
                user_id: userId,
                order_number: orderNumber,
                status: 'pending',
                payment_status: 'pending',
                payment_method: 'paypal',
                shipping_address: {
                    line1: shippingAddress.line1,
                    line2: shippingAddress.line2 || '',
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    postal_code: shippingAddress.postal_code,
                    country: shippingAddress.country || 'US',
                    phone: shippingAddress.phone || ''
                },
                billing_address: {
                    line1: billingAddress.line1,
                    line2: billingAddress.line2 || '',
                    city: billingAddress.city,
                    state: billingAddress.state,
                    postal_code: billingAddress.postal_code,
                    country: billingAddress.country || 'US',
                    phone: billingAddress.phone || ''
                },
                subtotal: subtotal,
                tax_amount: taxAmount,
                shipping_cost: shippingCost,
                total_amount: totalAmount,
                currency: 'USD',
                notes: notes
            }, { transaction });

            // 7. Create order items
            const orderItemsData = cart.cart_items.map(cartItem => ({
                order_id: order.id,
                product_id: cartItem.product_id,
                quantity: cartItem.quantity,
                unit_price: cartItem.product.online_price,
                total_price: (cartItem.product.online_price * cartItem.quantity)
            }));

            await OrderItem.bulkCreate(orderItemsData, { transaction });

            // 8. Create PayPal order
            const paypalOrderData = {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: `order_${order.id}`,
                        description: `Order ${orderNumber}`,
                        custom_id: order.id.toString(),
                        invoice_id: orderNumber,
                        amount: {
                            currency_code: 'USD',
                            value: totalAmount.toFixed(2),
                            breakdown: {
                                item_total: {
                                    currency_code: 'USD',
                                    value: subtotal.toFixed(2)
                                },
                                tax_total: {
                                    currency_code: 'USD',
                                    value: taxAmount.toFixed(2)
                                },
                                shipping: {
                                    currency_code: 'USD',
                                    value: shippingCost.toFixed(2)
                                }
                            }
                        },
                        items: lineItems,
                        shipping: deliveryMethod === 'delivery' ? {
                            name: {
                                full_name: shippingAddress?.full_name.trim()
                            },
                            address: {
                                address_line_1: shippingAddress.line1,
                                address_line_2: shippingAddress.line2 || '',
                                admin_area_2: shippingAddress.city,
                                admin_area_1: shippingAddress.state,
                                postal_code: shippingAddress.postal_code,
                                country_code: shippingAddress.country || 'US'
                            }
                        } : undefined
                    }
                ],
                application_context: {
                    brand_name: paypalService.storeName,
                    landing_page: 'NO_PREFERENCE',
                    user_action: 'PAY_NOW',
                    shipping_preference: deliveryMethod === 'delivery' ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING',
                    payment_method: {
                        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                    },
                    return_url: `${paypalService.frontendUrl}/order-confirmation?orderId=${order.id}&orderNumber=${orderNumber}`,
                    cancel_url: `${paypalService.frontendUrl}/checkout`,
                    locale: 'en-US'
                }
            };

            // 9. Create order in PayPal
            const paypalOrder = await paypalService.makePayPalRequest(
                'POST',
                '/v2/checkout/orders',
                paypalOrderData
            );

            // 10. Create payment record
            const payment = await Payment.create({
                order_id: order.id,
                payment_method: 'paypal',
                amount: totalAmount,
                currency: 'USD',
                status: 'pending',
                paypal_order_id: paypalOrder.id,
                gateway_response: paypalOrder,
                created_at: new Date(),
                updated_at: new Date()
            }, { transaction });

            // 11. Commit transaction
            await transaction.commit();

            // 12. Return response
            return {
                success: true,
                data: {
                    orderId: order.id,
                    orderNumber: order.order_number,
                    paypalOrderId: paypalOrder.id,
                    approvalUrl: paypalOrder.links.find(link => link.rel === 'approve')?.href,
                    status: 'created',
                    amount: totalAmount,
                    currency: 'USD'
                },
                message: "Order created successfully"
            };

        } catch (error) {
            await transaction.rollback();

            console.error('PayPal order creation error:', {
                message: error.message,
                userId,
                cartId,
                environment: paypalService.environment,
                timestamp: new Date().toISOString()
            });

            throw new Error(`Order creation failed: ${error.message}`);
        }
    },

    /**
     * Capture PayPal order
     */
    capturePayPalOrderAndCreateOrder: async (orderId, paypalOrderId, userId) => {
        const transaction = await sequelize.transaction();

        try {
            // 1. Verify order belongs to user
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
                throw new Error(`Order payment already ${order.payment_status}`);
            }

            // 2. Capture the PayPal order
            const captureResult = await paypalService.makePayPalRequest(
                'POST',
                `/v2/checkout/orders/${paypalOrderId}/capture`
            );

            // 3. Validate capture result
            if (captureResult.status !== 'COMPLETED') {
                throw new Error(`PayPal order capture failed. Status: ${captureResult.status}`);
            }

            // 4. Get capture details
            const capture = captureResult.purchase_units[0].payments.captures[0];
            if (!capture) {
                throw new Error('No capture found in PayPal response');
            }

            const captureId = capture.id;
            const captureAmount = capture.amount.value;

            // 5. Update product quantities
            for (const orderItem of order.items) {
                await Product.decrement('quantity', {
                    by: orderItem.quantity,
                    where: { id: orderItem.product_id },
                    transaction
                });
            }

            // 6. Update order status
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

            // 7. Update payment status
            await Payment.update(
                {
                    status: 'succeeded',
                    transaction_id: captureId,
                    gateway_response: captureResult
                },
                {
                    where: { order_id: orderId },
                    transaction
                }
            );

            // 8. Clear user's cart
            const cart = await Cart.findOne({
                where: { user_id: userId },
                transaction
            });

            if (cart) {
                await CartItem.destroy({
                    where: { cart_id: cart.id },
                    transaction
                });
            }

            // 9. Commit transaction
            await transaction.commit();

            return {
                success: true,
                data: {
                    orderId: order.id,
                    status: 'succeeded',
                    transactionId: captureId,
                    paypalOrderId: paypalOrderId,
                    amount: captureAmount
                },
                message: "Payment completed successfully"
            };

        } catch (error) {
            await transaction.rollback();
            try {
                await Order.update(
                    { payment_status: 'failed', status: 'cancelled' },
                    { where: { id: orderId } }
                );

                await Payment.update(
                    { status: 'failed' },
                    { where: { order_id: orderId } }
                );
            } catch (updateError) {
                console.error('Failed to update order status:', updateError);
            }

            if (error.message.includes('RESOURCE_NOT_FOUND')) {
                throw new Error('PayPal order not found or already processed');
            }

            throw new Error(`Payment capture failed: ${error.message}`);
        }
    },

    /**
     * Get PayPal order status
     */
    getPayPalOrderStatus: async (orderId) => {
        try {
            const orderDetails = await paypalService.makePayPalRequest(
                'GET',
                `/v2/checkout/orders/${orderId}`
            );

            return {
                success: true,
                data: {
                    id: orderDetails.id,
                    status: orderDetails.status,
                    intent: orderDetails.intent,
                    create_time: orderDetails.create_time,
                    update_time: orderDetails.update_time,
                    amount: orderDetails.purchase_units[0].amount,
                    payer: orderDetails.payer
                }
            };
        } catch (error) {
            throw new Error(`Failed to retrieve PayPal order status: ${error.message}`);
        }
    },

    /**
     * Complete order payment (used by webhook)
     */
    completeOrderPayment: async (orderId) => {
        const transaction = await sequelize.transaction();

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

            await transaction.commit();

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Order completion failed: ${error.message}`);
        }
    },

    /**
     * Refund PayPal payment
     */
    refundPayment: async (orderId, captureId, amount, reason = 'REFUND') => {
        const transaction = await sequelize.transaction();

        try {
            // 1. Create refund in PayPal
            const refundData = {
                amount: {
                    value: amount.toFixed(2),
                    currency_code: 'USD'
                },
                note_to_payer: reason
            };

            const refund = await paypalService.makePayPalRequest(
                'POST',
                `/v2/payments/captures/${captureId}/refund`,
                refundData
            );

            // 2. Update payment status
            await Payment.update(
                { status: 'refunded' },
                {
                    where: {
                        order_id: orderId,
                        transaction_id: captureId
                    },
                    transaction
                }
            );

            // 3. Update order status
            await Order.update(
                {
                    payment_status: 'refunded',
                    status: 'refunded'
                },
                {
                    where: { id: orderId },
                    transaction
                }
            );

            // 4. Restore product quantities
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

            await transaction.commit();

            return {
                success: true,
                data: refund,
                message: "Payment refunded successfully"
            };

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to process refund: ${error.message}`);
        }
    },

    /**
     * Handle PayPal webhook with signature verification
     */
    handleWebhook: async (req) => {
        const event = req.body;
        const headers = req.headers;

        try {
            // Verify webhook signature in production
            if (paypalService.environment === 'live') {
                const isValid = await paypalService.verifyWebhookSignature(headers, event);
                if (!isValid) {
                    throw new Error('Invalid webhook signature');
                }
            }

            // Process webhook events
            switch (event.event_type) {
                case 'CHECKOUT.ORDER.APPROVED':
                    console.log('Order approved:', event.resource.id);
                    break;

                case 'PAYMENT.CAPTURE.COMPLETED':
                    const capture = event.resource;
                    console.log('Payment captured:', capture.id);

                    // Find order by custom_id
                    const orderId = capture.custom_id || event.resource.custom_id;
                    if (orderId) {
                        await paypalPaymentService.completeOrderPayment(parseInt(orderId));
                    }
                    break;

                case 'PAYMENT.CAPTURE.DENIED':
                case 'PAYMENT.CAPTURE.FAILED':
                    const failedCapture = event.resource;
                    console.log('Payment failed:', failedCapture.id);

                    await Payment.update(
                        { status: 'failed' },
                        {
                            where: { transaction_id: failedCapture.id },
                            returning: true
                        }
                    );
                    break;

                case 'PAYMENT.CAPTURE.REFUNDED':
                    const refundedCapture = event.resource;
                    console.log('Payment refunded:', refundedCapture.id);

                    await Payment.update(
                        { status: 'refunded' },
                        {
                            where: { transaction_id: refundedCapture.id },
                            returning: true
                        }
                    );
                    break;

                default:
                    console.log(`Unhandled PayPal event: ${event.event_type}`);
            }

            return {
                success: true,
                message: 'Webhook processed successfully'
            };
        } catch (error) {
            console.error('Webhook processing failed:', error);
            throw new Error(`Failed to process PayPal webhook: ${error.message}`);
        }
    }

};

export default paypalPaymentService;