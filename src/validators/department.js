import { body, param, query } from "express-validator";

const createDepartmentValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Department name is required')
        .isLength({ max: 100 })
        .withMessage('Department name must be less than 100 characters')
        .matches(/^[a-zA-Z0-9\s\-&]+$/)
        .withMessage('Department name can only contain letters, numbers, spaces, hyphens, and ampersands')
];

const updateDepartmentValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid department ID'),
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department name must be less than 100 characters')
        .matches(/^[a-zA-Z0-9\s\-&]+$/)
        .withMessage('Department name can only contain letters, numbers, spaces, hyphens, and ampersands')
];

const getDepartmentsValidation = [
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
        .isIn(['id', 'name', 'created_at', 'updated_at'])
        .withMessage('Invalid sort field'),
    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC'])
        .withMessage('Sort order must be ASC or DESC')
];

const departmentIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Invalid department ID')
];

const bulkCreateValidation = [
    body('departments')
        .isArray({ min: 1 })
        .withMessage('Departments must be an array with at least one item'),
    body('departments.*.name')
        .trim()
        .notEmpty()
        .withMessage('Each department must have a name')
        .isLength({ max: 100 })
        .withMessage('Department name must be less than 100 characters')
];

export {
    getDepartmentsValidation,
    departmentIdValidation,
    createDepartmentValidation,
    bulkCreateValidation,
    updateDepartmentValidation
}