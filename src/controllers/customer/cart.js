import cartService from "../../services/cart.js";
import sendResponse from "../../utils/responseHelper.js";

export const addItemToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity = 1 } = req.body;

    const cart = await cartService.addItem(userId, product_id, quantity);

    sendResponse(res, {
      status: 200,
      message: "Item added to cart",
      data: cart
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 :
      error.message.includes('stock') ? 400 : 500;
    sendResponse(res, { status, message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return sendResponse(res, { status: 400, message: "Invalid quantity" });
    }

    const cart = await cartService.updateItemQuantity(userId, productId, quantity);

    sendResponse(res, {
      status: 200,
      message: "Cart updated successfully",
      data: cart
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    sendResponse(res, { status, message: error.message });
  }
};

export const removeItemFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await cartService.removeItem(userId, productId);

    sendResponse(res, {
      status: 200,
      message: "Item removed from cart",
      data: cart
    });
  } catch (error) {
    sendResponse(res, { status: 404, message: error.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await cartService.getCartWithItems(userId);

    sendResponse(res, {
      status: 200,
      message: "Cart retrieved successfully",
      data: cart
    });
  } catch (error) {
    sendResponse(res, { status: 500, message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await cartService.clearCart(userId);

    sendResponse(res, {
      status: 200,
      message: "Cart cleared successfully",
      data: cart
    });
  } catch (error) {
    sendResponse(res, { status: 500, message: error.message });
  }
};