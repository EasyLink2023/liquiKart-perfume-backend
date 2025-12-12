import express from 'express';
const router = express.Router();

// Import controllers
import {
    userProfile,
    dashboard,
    uploadAvatar,
    updateUserProfile,
    updateAvatar,
    removeAvatar
} from '../controllers/userProfile.js';

// Import validation middleware
import {
    validateUserProfile,
    validateProfileImage,
    validateAvatarUpdate,
} from '../validators/userProfile.js';

// User profile routes
router.post('/avatar', validateProfileImage, uploadAvatar);
router.patch('/avatar', validateAvatarUpdate, updateAvatar);
router.delete('/avatar', removeAvatar);

router.get('/', userProfile);
router.get('/dashboard', dashboard);
router.patch('/:id', validateUserProfile, updateUserProfile);

export default router;