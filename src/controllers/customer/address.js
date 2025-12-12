import { validationResult } from 'express-validator';
import addressService from "../../services/address.js";
import sendResponse from "../../utils/responseHelper.js";

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, {
      status: 400,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Create new address
 */
export const createAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    // Check address limit (max 10 addresses per user)
    const addressCount = await addressService.countUserAddresses(userId);
    if (addressCount >= 10) {
      return sendResponse(res, {
        status: 400,
        message: "Address limit reached. Maximum 10 addresses allowed.",
      });
    }

    const address = await addressService.createAddress({
      ...req.body,
      user_id: userId,
    });

    return sendResponse(res, {
      status: 201,
      message: "Address created successfully",
      data: address,
    });
  } catch (error) {
    console.error('Create address error:', error);

    if (error.name === 'SequelizeValidationError') {
      return sendResponse(res, {
        status: 400,
        message: "Validation error",
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendResponse(res, {
        status: 400,
        message: "Address already exists",
      });
    }

    return sendResponse(res, {
      status: 500,
      message: "Internal server error while creating address",
    });
  }
};

/**
 * Get all addresses for a user with pagination
 */
export const getAddresses = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    const {
      page = 1,
      limit = 10,
      includeInactive = false,
      type = null
    } = req.query;

    const result = await addressService.getAddressesByUser(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      includeInactive: includeInactive === 'true',
      type
    });

    return sendResponse(res, {
      status: 200,
      message: "Addresses fetched successfully",
      data: result.addresses,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    return sendResponse(res, {
      status: 500,
      message: "Internal server error while fetching addresses",
    });
  }
};

/**
 * Get a single address by ID
 */
export const getAddressById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    const { id } = req.params;
    const { includeInactive = false } = req.query;

    const address = await addressService.getAddressById(
      id,
      userId,
      includeInactive === 'true'
    );

    return sendResponse(res, {
      status: 200,
      message: "Address fetched successfully",
      data: address,
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return sendResponse(res, {
        status: 404,
        message: "Address not found",
      });
    }

    console.error('Get address error:', error);
    return sendResponse(res, {
      status: 500,
      message: "Internal server error while fetching address",
    });
  }
};

/**
 * Update address
 */
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    const { id } = req.params;

    const updatedAddress = await addressService.updateAddress(id, userId, req.body);

    return sendResponse(res, {
      status: 200,
      message: "Address updated successfully",
      data: updatedAddress,
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return sendResponse(res, {
        status: 404,
        message: "Address not found",
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return sendResponse(res, {
        status: 400,
        message: "Validation error",
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    console.error('Update address error:', error);
    return sendResponse(res, {
      status: 500,
      message: "Internal server error while updating address",
    });
  }
};

/**
 * Delete address (soft delete)
 */
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    const { id } = req.params;

    await addressService.deleteAddress(id, userId);

    return sendResponse(res, {
      status: 200,
      message: "Address deleted successfully",
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return sendResponse(res, {
        status: 404,
        message: "Address not found",
      });
    }

    console.error('Delete address error:', error);
    return sendResponse(res, {
      status: 500,
      message: "Internal server error while deleting address",
    });
  }
};

/**
 * Set address as default
 */
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    const { id } = req.params;

    const address = await addressService.setDefaultAddress(id, userId);

    return sendResponse(res, {
      status: 200,
      message: "Address set as default successfully",
      data: address,
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return sendResponse(res, {
        status: 404,
        message: "Address not found",
      });
    }

    console.error('Set default address error:', error);
    return sendResponse(res, {
      status: 500,
      message: "Internal server error while setting default address",
    });
  }
};

/**
 * Get default address
 */
export const getDefaultAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    const address = await addressService.getDefaultAddress(userId);

    if (!address) {
      return sendResponse(res, {
        status: 404,
        message: "No default address found",
      });
    }

    return sendResponse(res, {
      status: 200,
      message: "Default address fetched successfully",
      data: address,
    });
  } catch (error) {
    console.error('Get default address error:', error);
    return sendResponse(res, {
      status: 500,
      message: "Internal server error while fetching default address",
    });
  }
};

/**
 * Restore deleted address
 */
export const restoreAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: "Unauthorized: User authentication required",
      });
    }

    const { id } = req.params;

    const address = await addressService.restoreAddress(id, userId);

    return sendResponse(res, {
      status: 200,
      message: "Address restored successfully",
      data: address,
    });
  } catch (error) {
    if (error.message === 'Address not found or already active') {
      return sendResponse(res, {
        status: 404,
        message: "Address not found or already active",
      });
    }

    console.error('Restore address error:', error);
    return sendResponse(res, {
      status: 500,
      message: "Internal server error while restoring address",
    });
  }
};

export { handleValidationErrors };