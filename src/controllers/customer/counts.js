import { Cart, CartItem, Wishlist, Order } from "../../models/index.js";

export const getCounts = async (req, res) => {
    try {
        const user_id = req.user.id;

        const cartCount = await CartItem.count({
            include: [{
                model: Cart,
                as: 'cart',
                where: { user_id },
                required: true
            }]
        });

        const wishlistCount = await Wishlist.count({ where: { user_id } });
        const orderCount = await Order.count({ where: { user_id } });

        return res.json({
            status: 200,
            message: 'Counts fetched successfully',
            data: {
                cartCount,
                wishlistCount,
                orderCount
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: 'Failed to fetch counts'
        });
    }
};