import { Op } from "sequelize";
import { Wishlist, Product } from "../models/index.js";

const wishlistService = {
  /**
   * Toggle product in wishlist (add if not exists, remove if exists)
   */
  async toggleWishlistItem(userId, productId) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const existingWishlist = await Wishlist.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (existingWishlist) {
      await existingWishlist.destroy();
      return { added: false, productId, action: 'removed' };
    } else {
      const wishlistItem = await Wishlist.create({
        user_id: userId,
        product_id: productId
      });
      return { added: true, productId, action: 'added', wishlistItem };
    }
  },

  /**
   * Get user's wishlist with pagination and product details
   */
  async getUserWishlist(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Wishlist.findAndCountAll({
      where: { user_id: userId },
      include: [{
        model: Product,
        as: 'product',
        include: ['images'],
        attributes: ['id', 'name', 'price', 'online_price', 'quantity', 'status', 'size']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    return {
      items: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNext: (page * limit) < count,
        hasPrev: page > 1
      }
    };
  },

  /**
   * Remove specific product from user's wishlist
   */
  async removeFromWishlist(userId, id) {
    const result = await Wishlist.destroy({
      where: {
        id,
        user_id: userId
      }
    });

    return result > 0;
  },

  /**
   * Clear all items from user's wishlist
   */
  async clearUserWishlist(userId) {
    const result = await Wishlist.destroy({
      where: { user_id: userId }
    });

    return result;
  },

  /**
   * Get popular wishlisted products (admin analytics)
   */
  async getPopularWishlistedProducts(limit = 10) {
    const popularProducts = await Wishlist.findAll({
      attributes: [
        'product_id',
        [Wishlist.sequelize.fn('COUNT', Wishlist.sequelize.col('product_id')), 'wishlist_count']
      ],
      group: ['product_id'],
      order: [[Wishlist.sequelize.literal('wishlist_count'), 'DESC']],
      limit: parseInt(limit),
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'online_price']
      }]
    });

    return popularProducts;
  }
};

export default wishlistService;