import { body, param, query } from "express-validator";

const validateCreateCategory = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
];

const validateBulkCreateCategories = [
    body('categories')
        .isArray({ min: 1 })
        .withMessage('Categories must be a non-empty array'),
    body('categories.*.name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ max: 255 })
        .withMessage('Category name must not exceed 255 characters'),
    body('categories.*.department_id')
        .isInt({ min: 1 })
        .withMessage('Valid department ID is required'),
    body('categories.*.description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    body('categories.*.image_url')
        .optional()
        .isURL()
        .withMessage('Image URL must be a valid URL')
];

const validateUpdateCategory = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid category ID'),

    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Category name cannot be empty')
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    body('parent_id')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Parent ID must be a positive integer or null')
];

const validateCategoryQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('sortBy')
        .optional()
        .isIn(['name', 'createdAt', 'updatedAt'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC'),

    query('departmentId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('departmentId must be a positive integer'),

    query('department_names')
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                const names = value.split(',');
                return names.every(name => typeof name === 'string' && name.trim().length > 0);
            }
            return false;
        })
        .withMessage('Department names must be a comma-separated list of strings'),
];

export {
    validateCreateCategory,
    validateBulkCreateCategories,
    validateUpdateCategory,
    validateCategoryQuery
}