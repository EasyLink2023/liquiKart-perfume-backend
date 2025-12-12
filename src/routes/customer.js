import express from "express";
import { allowCustomer } from "../middlewares/role.js";

import {
  validateCreateAddress,
  validateUpdateAddress,
  validateAddressId,
  validateGetAddresses
} from "../validators/address.js";

import {
  createAddress,
  getAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
  restoreAddress,
  handleValidationErrors
} from "../controllers/customer/address.js";

import {
  addItemToCart,
  removeItemFromCart,
  updateCartItem,
  getCart,
  clearCart
} from "../controllers/customer/cart.js";

import {
  toggleWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/customer/wishlist.js";

import { getCounts } from "../controllers/customer/counts.js";

const router = express.Router();
router.use(allowCustomer);
// count
router.get('/header/counts', allowCustomer, getCounts);

// Address routes
router.post("/addresses", validateCreateAddress, handleValidationErrors, createAddress);
router.get("/addresses", validateGetAddresses, handleValidationErrors, getAddresses);
router.get("/addresses/default", getDefaultAddress);
router.get("/addresses/:id", validateAddressId, handleValidationErrors, getAddressById);
router.put("/addresses/:id", validateAddressId, validateUpdateAddress, handleValidationErrors, updateAddress);
router.patch("/addresses/:id/default", validateAddressId, handleValidationErrors, setDefaultAddress);
router.delete("/addresses/:id", validateAddressId, handleValidationErrors, deleteAddress);
router.patch("/addresses/:id/restore", validateAddressId, handleValidationErrors, restoreAddress);

// Cart routes
router.post("/cart/items", addItemToCart);
router.put("/cart/items/:productId", updateCartItem);
router.delete("/cart/items/:productId", removeItemFromCart);
router.get("/cart", getCart);
router.delete("/cart", clearCart);

// Wishlist routes
router.post("/wishlist/toggle", toggleWishlist);
router.get("/wishlist", getWishlist);
router.delete("/wishlist/:id", removeFromWishlist);
router.delete("/wishlist", clearWishlist);

export default router;