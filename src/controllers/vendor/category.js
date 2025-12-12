import { validationResult } from "express-validator";
import categoryService from "../../services/category.js";
import sendResponse from "../../utils/responseHelper.js";

/**
 * Handle getting all categories
 */
const getCategories = async (req, res) => {
  try {
    const { page, limit, search, sortBy, sortOrder, departmentId, department_names } = req.query;

    const result = await categoryService.getCategories({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: search || '',
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'ASC',
      departmentId: departmentId || null,
      department_names
    });

    sendResponse(res, {
      status: 200,
      message: 'Categories retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    sendResponse(res, {
      status: 500,
      message: error.message,
      data: null
    });
  }
}

/**
 * Handle getting category by ID
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await categoryService.getCategoryById(parseInt(id));

    sendResponse(res, {
      status: 200,
      message: 'Category retrieved successfully',
      data: result.data
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    sendResponse(res, {
      status: statusCode,
      message: error.message,
      data: null
    });
  }
}

/**
 * Handle category creation
 */
const createCategory = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, {
        status: 400,
        message: 'Validation failed',
        data: errors.array()
      });
    }

    const result = await categoryService.createCategory(req.body);

    sendResponse(res, {
      status: 201,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse(res, {
      status: 400,
      message: error.message,
      data: null
    });
  }
}

/**
 * Handle category update
 */
const updateCategory = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, {
        status: 400,
        message: 'Validation failed',
        data: errors.array()
      });
    }

    const { id } = req.params;
    const result = await categoryService.updateCategory(parseInt(id), req.body);

    sendResponse(res, {
      status: 200,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    sendResponse(res, {
      status: statusCode,
      message: error.message,
      data: null
    });
  }
}

/**
 * Handle category deletion
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(parseInt(id));

    sendResponse(res, {
      status: 200,
      message: result.message,
      data: null
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    sendResponse(res, {
      status: statusCode,
      message: error.message,
      data: null
    });
  }
}

/**
 * Handle bulk category creation
 */
const bulkCreateCategories = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, {
        status: 400,
        message: 'Validation failed',
        data: errors.array()
      });
    }

    const { categories } = req.body;
    const result = await categoryService.bulkCreateCategories(categories);

    sendResponse(res, {
      status: 201,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    sendResponse(res, {
      status: 400,
      message: error.message,
      data: null
    });
  }
}

export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkCreateCategories
};