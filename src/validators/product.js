import { body, param, query } from 'express-validator';

const createProductValidation = [
    body('item_lookup_code')
        .notEmpty()
        .withMessage('Item lookup code is required')
        .isLength({ max: 50 })
        .withMessage('Item lookup code must be less than 50 characters'),

    body('name')
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ max: 255 })
        .withMessage('Product name must be less than 255 characters'),

    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),

    body('size')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Size must be less than 50 characters'),

    body('category_id')
        .notEmpty()
        .withMessage('Category ID is required')
        .isInt()
        .withMessage('Category ID must be an integer'),

    body('price')
        .notEmpty()
        .withMessage('Price is required')
        .isDecimal({ min: 0 })
        .withMessage('Price must be a positive decimal'),

    body('sale_price')
        .optional()
        .isDecimal({ min: 0 })
        .withMessage('Sale price must be a positive decimal'),

    body('online_price')
        .notEmpty()
        .withMessage('Online price is required')
        .isDecimal({ min: 0 })
        .withMessage('Online price must be a positive decimal'),

    body('cost')
        .notEmpty()
        .withMessage('Cost is required')
        .isDecimal({ min: 0 })
        .withMessage('Cost must be a positive decimal'),

    body('quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),

    body('status')
        .optional()
        .isIn(['active', 'inactive', 'discontinued'])
        .withMessage('Status must be one of: active, inactive, discontinued')
];

const updateProductValidation = [
    param('id')
        .isInt()
        .withMessage('Product ID must be an integer'),

    body('item_lookup_code')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Item lookup code must be less than 50 characters'),

    body('name')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Product name must be less than 255 characters'),

    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),

    body('size')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Size must be less than 50 characters'),

    body('category_id')
        .optional()
        .isInt()
        .withMessage('Category ID must be an integer'),

    body('price')
        .optional()
        .isDecimal({ min: 0 })
        .withMessage('Price must be a positive decimal'),

    body('sale_price')
        .optional()
        .isDecimal({ min: 0 })
        .withMessage('Sale price must be a positive decimal'),

    body('online_price')
        .optional()
        .isDecimal({ min: 0 })
        .withMessage('Online price must be a positive decimal'),

    body('cost')
        .optional()
        .isDecimal({ min: 0 })
        .withMessage('Cost must be a positive decimal'),

    body('quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),

    body('status')
        .optional()
        .isIn(['active', 'inactive', 'discontinued'])
        .withMessage('Status must be one of: active, inactive, discontinued'),

    body('images')
        .optional()
        .isArray()
        .withMessage('Images must be an array')
        .custom((images) => {
            if (images) {
                // Check max images limit
                if (images.length > 10) {
                    throw new Error('Maximum 10 images allowed per product');
                }

                // Check if at least one primary image exists
                const primaryImages = images.filter(img => img.is_primary === true);
                if (primaryImages.length > 1) {
                    throw new Error('Only one image can be marked as primary');
                }
            }
            return true;
        }),

    body('images.*.url')
        .if(body('images').exists())
        .notEmpty()
        .withMessage('Image URL is required'),

    body('images.*.is_primary')
        .if(body('images').exists())
        .optional()
        .isBoolean()
        .withMessage('is_primary must be a boolean')
];

const productQueryValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('category_id')
        .optional()
        .isInt()
        .withMessage('Category ID must be an integer'),

    query('category_names')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                const names = value.split(',');
                return names.every(name => typeof name === 'string' && name.trim().length > 0);
            }
            return false;
        })
        .withMessage('Category names must be a comma-separated list of strings'),

    query('status')
        .optional()
        .isIn(['active', 'inactive', 'discontinued'])
        .withMessage('Status must be one of: active, inactive, discontinued'),

    query('search')
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage('Search query must be a string with max 100 characters'),

    query('sortBy')
        .optional()
        .isIn(['name', 'price', 'created_at', 'popularity'])
        .withMessage('SortBy must be one of: name, price, created_at, popularity'),

    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('SortOrder must be ASC or DESC'),

    query('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Min price must be a positive number'),

    query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max price must be a positive number'),

    query('inStock')
        .optional()
        .isBoolean()
        .withMessage('InStock must be a boolean (true/false)')
        .toBoolean(),

    query('onSale')
        .optional()
        .isBoolean()
        .withMessage('OnSale must be a boolean (true/false)')
        .toBoolean(),

    query('newArrivals')
        .optional()
        .isBoolean()
        .withMessage('NewArrivals must be a boolean (true/false)')
        .toBoolean(),

    query('minRating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Min rating must be between 0 and 5')
];

const validateBulkCreateProducts = [
    body('products')
        .exists()
        .withMessage('Products array is required')
        .isArray({ min: 1 })
        .withMessage('Products must be an array with at least 1 item'),

    body('products.*.item_lookup_code')
        .notEmpty()
        .withMessage('Item lookup code is required')
        .isLength({ max: 255 })
        .withMessage('Item lookup code must be less than 255 characters')
        .trim(),

    body('products.*.name')
        .notEmpty()
        .withMessage('Product name is required')
        .isLength({ max: 255 })
        .withMessage('Product name must be less than 255 characters')
        .trim(),

    body('products.*.description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim(),

    body('products.*.size')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Size must be less than 100 characters')
        .trim(),

    body('products.*.department_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Department ID must be a positive integer'),

    body('products.*.department_name')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Department name must be less than 100 characters')
        .trim(),

    body('products.*.category_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer'),

    body('products.*.category_name')
        .optional()
        .isLength({ max: 150 })
        .withMessage('Category name must be less than 150 characters')
        .trim(),

    body('products.*.price')
        .notEmpty()
        .withMessage('Price is required')
        .isFloat({ min: 0.01 })
        .withMessage('Price must be greater than 0'),

    body('products.*.sale_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Sale price must be a positive number'),

    body('products.*.online_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Online price must be a positive number'),

    body('products.*.cost')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Cost must be a positive number'),

    body('products.*.quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),

    body('products.*.status')
        .optional()
        .isIn(['active', 'inactive', 'discontinued'])
        .withMessage('Status must be one of: active, inactive, discontinued'),

    body('products.*').custom((value, { req }) => {
        if (!value.department_id && !value.department_name) {
            throw new Error('Either department_id or department_name is required');
        }

        if (!value.category_id && !value.category_name) {
            throw new Error('Either category_id or category_name is required');
        }

        return true;
    })
];

export {
    createProductValidation,
    updateProductValidation,
    productQueryValidation,
    validateBulkCreateProducts
};