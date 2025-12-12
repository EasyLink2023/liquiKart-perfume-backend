import { validationResult } from 'express-validator';
import userService from "../services/user.js";

/**
 * Handle user creation
 */
const createUser = async (req, res) => {
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

        const body = req.body || {};
        const {
            firstname,
            lastname,
            phone,
            email,
            password,
            role = "CUSTOMER",
        } = body;

        const result = await userService.createUser({
            email,
            password,
            role,
            profile: { first_name: firstname, last_name: lastname, phone }
        });


        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle getting all users
 */
const getUsers = async (req, res) => {
    try {
        const { page, limit, search, role, is_active, sortBy, sortOrder } = req.query;

        const result = await userService.getUsers({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            search: search || '',
            role: role || '',
            is_active: is_active || '',
            sortBy: sortBy || 'created_at',
            sortOrder: sortOrder || 'DESC'
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
 * Handle getting user by ID
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await userService.getUserById(id);

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
 * Handle user update
 */
const updateUser = async (req, res) => {
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
        const result = await userService.updateUser(id, req.body);

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
 * Handle user deletion
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await userService.deleteUser(id);

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
 * Handle user status toggle
 */
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await userService.toggleUserStatus(id);

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
    createUser,
    deleteUser,
    getUserById,
    getUsers,
    toggleUserStatus,
    updateUser
}