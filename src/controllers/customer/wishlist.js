import wishlistService from "../../services/wishlist.js";
import sendResponse from "../../utils/responseHelper.js";

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendResponse(res, { status: 401, message: "Unauthorized" });

    const { product_id } = req.body;

    if (!product_id) {
      return sendResponse(res, { status: 400, message: "Product ID is required" });
    }

    const result = await wishlistService.toggleWishlistItem(userId, product_id);

    return sendResponse(res, {
      status: 200,
      message: result.added ? "Item added to wishlist" : "Item removed from wishlist",
      data: result
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return sendResponse(res, { status: 404, message: error.message });
    }
    return sendResponse(res, { status: 500, message: error.message });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendResponse(res, { status: 401, message: "Unauthorized" });
    const { page = 1, limit = 20 } = req.query;

    const wishlist = await wishlistService.getUserWishlist(userId, { page, limit });

    return sendResponse(res, {
      status: 200,
      message: "Wishlist fetched successfully",
      data: wishlist
    });
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendResponse(res, { status: 401, message: "Unauthorized" });
    const { id } = req.params;

    const removed = await wishlistService.removeFromWishlist(userId, id);

    if (!removed) {
      return sendResponse(res, { status: 404, message: "Item not found in wishlist" });
    }

    return sendResponse(res, { status: 200, message: "Item removed from wishlist" });
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};

export const clearWishlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return sendResponse(res, { status: 401, message: "Unauthorized" });

    await wishlistService.clearUserWishlist(userId);

    return sendResponse(res, { status: 200, message: "Wishlist cleared successfully" });
  } catch (error) {
    return sendResponse(res, { status: 500, message: error.message });
  }
};