import sendResponse from '../utils/responseHelper.js';
import profileService from '../services/profile.js';

/**
 * Get user profile
 */
const userProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: 'Unauthorized: No user ID in token',
      });
    }

    const result = await profileService.getUserProfile(userId);
    return sendResponse(res, result);
  } catch (error) {
    console.error('User profile error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Get user dashboard data
 */
const dashboard = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: 'Unauthorized: No user ID in token',
      });
    }

    const result = await profileService.getUserDashboard(userId);
    return sendResponse(res, result);
  } catch (error) {
    console.error('Dashboard error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Upload profile image (Legacy - for URL-based uploads)
 */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { url } = req.body;

    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: 'Unauthorized: No user ID in token',
      });
    }

    const result = await profileService.uploadProfileImage(userId, url);
    return sendResponse(res, result);
  } catch (error) {
    console.error('Upload profile image error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Update user profile (partial update)
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: 'Unauthorized: No user ID in token',
      });
    }

    const { email, profile } = req.body;
    const result = await profileService.updateUserProfile(userId, { email, profile });
    return sendResponse(res, result);
  } catch (error) {
    console.error('Update user profile error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Update user avatar with file upload info
 */
const updateAvatar = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { avatar_url } = req.body;


    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: 'Unauthorized: No user ID in token',
      });
    }

    const result = await profileService.updateAvatar(userId, avatar_url);
    return sendResponse(res, result);
  } catch (error) {
    console.error('Update avatar error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

/**
 * Remove user avatar
 */
const removeAvatar = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, {
        status: 401,
        message: 'Unauthorized: No user ID in token',
      });
    }

    const result = await profileService.removeAvatar(userId);
    return sendResponse(res, result);
  } catch (error) {
    console.error('Remove avatar error:', error);
    return sendResponse(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

export {
  userProfile,
  dashboard,
  uploadAvatar,
  updateUserProfile,
  updateAvatar,
  removeAvatar
};