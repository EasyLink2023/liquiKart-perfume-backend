import { fedexRateService } from "../services/FedEX/rate.js";
import { Address, Cart, CartItem, Product } from "../models/index.js";

/**
 * Get shipping rates
 */
export const getRates = async (req, res) => {
    try {
        const { cartId, addressId } = req.body;

        if (!cartId || !addressId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: cartId, addressId'
            });
        }

        // Fetch cart with items
        const cart = await Cart.findOne({
            where: { id: cartId },
            attributes: ['id', 'user_id'],
            include: [{
                model: CartItem,
                as: 'cart_items',
                attributes: ['quantity'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['size']
                }]
            }]
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                error: 'Cart not found'
            });
        }

        if (!cart.cart_items || cart.cart_items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cart is empty'
            });
        }

        // Fetch shipping address
        const shippingAddress = await Address.findOne({
            where: {
                id: addressId,
                user_id: cart.user_id
            },
            attributes: ['postal_code', 'country', 'city', 'state', 'line1']
        });

        if (!shippingAddress) {
            return res.status(404).json({
                success: false,
                error: 'Address not found or does not belong to user'
            });
        }

        // Calculate package line items
        const requestedPackageLineItems = getPackageLineItems(cart.cart_items);

        // Prepare destination object
        const destination = {
            postalCode: shippingAddress.postal_code,
            countryCode: shippingAddress.country || 'US',
            city: shippingAddress.city || '',
            stateOrProvinceCode: shippingAddress.state || ''
        };

        console.log('📦 Shipping request:', {
            cartId,
            items: cart.cart_items.length,
            to: destination.postalCode,
            packages: requestedPackageLineItems.length
        });

        // Get rates from FedEx
        const rates = await fedexRateService.getShippingRates(
            requestedPackageLineItems,
            destination
        );

        return res.json({
            success: true,
            count: rates.length,
            data: rates,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Shipping error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get shipping rates',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Calculate package details for FedEx API
 */
const getPackageLineItems = (cartItems) => {
    let totalBottles = 0;

    cartItems.forEach(item => {
        totalBottles += item.quantity || 1;
    });

    // Realistic weight calculation for wine bottles
    const BOTTLE_WEIGHT_LBS = 2.75; // 750ml bottle + liquid
    const PACKAGING_PER_BOTTLE_LBS = 0.35;
    const BOX_WEIGHT_LBS = 0.5;

    const totalWeightLBS = (totalBottles * BOTTLE_WEIGHT_LBS) +
        (totalBottles * PACKAGING_PER_BOTTLE_LBS) +
        BOX_WEIGHT_LBS;

    // Get box dimensions
    const dimensions = getBoxDimensions(totalBottles);

    return [{
        weight: {
            units: "LB",
            value: Math.max(1, parseFloat(totalWeightLBS.toFixed(2)))
        },
        dimensions: dimensions
    }];
};

/**
 * Get box dimensions based on bottle count
 */
const getBoxDimensions = (bottleCount) => {
    const dimensions = { units: "IN" };

    if (bottleCount === 1) {
        dimensions.length = 15;
        dimensions.width = 6;
        dimensions.height = 6;
    } else if (bottleCount === 2) {
        dimensions.length = 16;
        dimensions.width = 8;
        dimensions.height = 8;
    } else if (bottleCount <= 3) {
        dimensions.length = 18;
        dimensions.width = 12;
        dimensions.height = 8;
    } else if (bottleCount <= 6) {
        dimensions.length = 20;
        dimensions.width = 15;
        dimensions.height = 12;
    } else if (bottleCount <= 12) {
        dimensions.length = 24;
        dimensions.width = 18;
        dimensions.height = 15;
    } else {
        dimensions.length = 24;
        dimensions.width = 24;
        dimensions.height = 18;
    }

    return dimensions;
};