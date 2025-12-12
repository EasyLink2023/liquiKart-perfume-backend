import express from "express";
const router = express.Router();

// Import validations
import {
    validateCreateCategory,
    validateUpdateCategory,
    validateCategoryQuery,
    validateBulkCreateCategories
} from '../validators/category.js';

import {
    createProductValidation,
    updateProductValidation,
    productQueryValidation,
    validateBulkCreateProducts
} from '../validators/product.js';

import {
    productImageBulkValidation,
    productImageAddOrUpdateValidation
} from "../validators/productImage.js";

// Import controllers
import {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    bulkCreateCategories
} from "../controllers/vendor/category.js";

import {
    bulkCreateProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProducts,
    getProductById,
    getFilterCounts,
    getProductByItemLookupCode,
    getLowStockProducts,
    exportProductsCSV
} from "../controllers/vendor/product.js";

import {
    bulkInsertImages,
    bulkDeleteImages,
    addOrUpdateImages,
    getProductImages
} from "../controllers/vendor/productImage.js";

import {
    getDashboardStats,
    getRecentOrders,
    getSalesData,
    getTopProducts
} from "../controllers/vendor/dashboard.js";

import authenticate from '../middlewares/auth.js';

// Category routes
router.get('/categories', validateCategoryQuery, getCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', authenticate, validateCreateCategory, createCategory);
router.put('/categories/:id', authenticate, validateUpdateCategory, updateCategory);
router.post('/categories/bulk', authenticate, validateBulkCreateCategories, bulkCreateCategories);
router.delete('/categories/:id', authenticate, deleteCategory);

// Product routes
router.get('/products/low-stock', authenticate, getLowStockProducts);
router.get('/products/item-lookup/:itemLookupCode', getProductByItemLookupCode);
router.get('/products/exportcsv', authenticate, exportProductsCSV);
router.get('/products', productQueryValidation, getProducts);
router.get('/products/filter-count', getFilterCounts);
router.get('/products/:id', getProductById);
router.post('/products', authenticate, createProductValidation, createProduct);
router.put('/products/:id', authenticate, updateProductValidation, updateProduct);
router.delete('/products/:id', authenticate, deleteProduct);
router.post('/products/bulk', authenticate, validateBulkCreateProducts, bulkCreateProducts);

// Product image routes
router.post('/:productId/images/bulk-insert', authenticate, productImageBulkValidation, bulkInsertImages);
router.delete('/:productId/images/bulk-delete', authenticate, bulkDeleteImages);
router.put('/:productId/images/add-or-update', authenticate, productImageAddOrUpdateValidation, addOrUpdateImages);
router.get('/:productId/images', authenticate, getProductImages);

// Dashboard routes
router.get('/dashboard/stats', authenticate, getDashboardStats);
router.get('/dashboard/recent-orders', authenticate, getRecentOrders);
router.get('/dashboard/sales-data', authenticate, getSalesData);
router.get('/dashboard/top-products', authenticate, getTopProducts);

export default router;