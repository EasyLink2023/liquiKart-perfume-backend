import { Op } from "sequelize";
import { Cart, CartItem, Product } from "../models/index.js";

const cartService = {

  async getCart(userId) {
    return await Cart.findOne({
      where: { user_id: userId }
    });
  },

  async getOrCreateCart(userId) {
    let cart = await this.getCart(userId);

    if (!cart) {
      cart = await Cart.create({
        user_id: userId,
        total_quantity: 0,
        total_amount: 0
      });
    }

    return cart;
  },

  async addItem(userId, productId, quantity = 1) {
    const cart = await this.getOrCreateCart(userId);

    // Check if product exists and is available
    const product = await Product.findOne({
      where: {
        id: productId,
        status: 'active',
        quantity: { [Op.gte]: quantity }
      }
    });

    if (!product) {
      throw new Error('Product not available or insufficient stock');
    }

    const [cartItem, created] = await CartItem.findOrCreate({
      where: { cart_id: cart.id, product_id: productId },
      defaults: { quantity }
    });

    if (!created) {
      const newQuantity = cartItem.quantity + quantity;
      if (newQuantity > product.quantity) {
        throw new Error('Insufficient stock');
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
    }

    return await this.getCartWithItems(userId);
  },

  async updateItemQuantity(userId, productId, quantity) {
    const cart = await this.getCart(userId);
    if (!cart) throw new Error('Cart not found');

    if (quantity < 1) {
      return await this.removeItem(userId, productId);
    }

    const product = await Product.findOne({
      where: {
        id: productId,
        status: 'active',
        quantity: { [Op.gte]: quantity }
      }
    });

    if (!product) {
      throw new Error('Product not available or insufficient stock');
    }

    const cartItem = await CartItem.findOne({
      where: { cart_id: cart.id, product_id: productId }
    });

    if (!cartItem) throw new Error('Item not found in cart');

    cartItem.quantity = quantity;
    await cartItem.save();

    return await this.getCartWithItems(userId);
  },

  async removeItem(userId, productId) {
    
    const cart = await this.getCart(userId);
    if (!cart) throw new Error('Cart not found');

    await CartItem.destroy({ where: { cart_id: cart.id, product_id: productId } });

    return await this.getCartWithItems(userId);
  },

  async clearCart(userId) {
    const cart = await this.getCart(userId);
    if (!cart) throw new Error('Cart not found');

    await CartItem.destroy({ where: { cart_id: cart.id } });
    return await this.getCartWithItems(userId);
  },

  async getCartWithItems(userId) {
    const cart = await Cart.findOne({
      where: { user_id: userId },
      include: [{
        model: CartItem,
        as: 'cart_items',
        include: [{
          model: Product,
          as: 'product',
          include: ['images']
        }]
      }]
    });

    if (!cart) {
      return await this.getOrCreateCart(userId);
    }

    return cart;
  },

};

export default cartService;