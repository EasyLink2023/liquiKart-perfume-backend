import { validationResult } from "express-validator";
import productImageService from "../../services/productImage.js";

/**
 * 1. Bulk insert - Insert bulk data directly
 */
const bulkInsertImages = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const { images } = req.body;

    const result = await productImageService.bulkInsert(parseInt(productId), images);

    res.status(201).json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 2. Bulk delete - Delete all records for the received product_id
 */
const bulkDeleteImages = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await productImageService.bulkDelete(parseInt(productId));

    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 3. Add or Update - Check the array, if exists update, new add, rest delete
 */
const addOrUpdateImages = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const { images } = req.body;

    const result = await productImageService.addOrUpdate(parseInt(productId), images);

    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Get product images
 */
const getProductImages = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await productImageService.getAllProductImages(parseInt(productId));

    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
}

export {
  bulkInsertImages,
  bulkDeleteImages,
  addOrUpdateImages,
  getProductImages
}