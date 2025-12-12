import { validationResult } from 'express-validator';
import departmentService from '../../services/department.js';

/**
 * Handle department creation
 */
const createDepartment = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const result = await departmentService.createDepartment(req.body);

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle getting all departments
 */
const getDepartments = async (req, res) => {
    try {
        const { page, limit, search, sortBy, sortOrder } = req.query;

        const result = await departmentService.getDepartments({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            search: search || '',
            sortBy: sortBy || 'name',
            sortOrder: sortOrder || 'ASC'
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle getting department by ID
 */
const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await departmentService.getDepartmentById(parseInt(id));

        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle department update
 */
const updateDepartment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const result = await departmentService.updateDepartment(parseInt(id), req.body);

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
 * Handle department deletion
 */
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await departmentService.deleteDepartment(parseInt(id));

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
 * Handle bulk department creation
 */
const bulkCreateDepartments = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const result = await departmentService.bulkCreateDepartments(req.body.departments);

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

export {
    getDepartments,
    getDepartmentById,
    createDepartment,
    bulkCreateDepartments,
    updateDepartment,
    deleteDepartment
}