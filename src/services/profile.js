import { User, Profile, Order } from "../models/index.js";

const profileService = {

    /**
     * Check if phone number exists
     */
    isPhoneNumberExists: async (phone) => {
        const profile = await Profile.findOne({ where: { phone } });
        return !!profile;
    },

    /**
     * Create user profile
     */
    createUserProfile: async (profileData, transaction) => {
        const profile = await Profile.create(profileData, { transaction });
        return profile.id;
    },

    /**
     * Upload profile image (legacy URL-based)
     */
    uploadProfileImage: async (userId, url) => {
        try {
            const profile = await Profile.findOne({ where: { user_id: userId } });

            if (!profile) {
                return {
                    status: 404,
                    message: 'Profile not found',
                };
            }

            url = process.env.SERVER_URL + url;
            await profile.update({ avatar_url: url });

            return {
                status: 200,
                message: 'Profile image updated successfully',
                data: { avatar_url: url },
            };
        } catch (error) {
            console.error('Upload profile image service error:', error);
            throw error;
        }
    },

    /**
     * Update avatar with file upload info
     */
    updateAvatar: async (userId, avatar_url) => {
        try {

            avatar_url = process.env.SERVER_URL + avatar_url;
            const result = await Profile.update({ avatar_url, }, { where: { user_id: userId } });

            if (result[0] === 0) {
                return {
                    status: 404,
                    message: 'Profile not found or no changes made',
                };
            }

            // Get updated profile
            const updatedProfile = await Profile.findOne({
                where: { user_id: userId },
                attributes: ['avatar_url']
            });

            return {
                status: 200,
                message: 'Avatar updated successfully',
                data: {
                    avatar_url: updatedProfile.avatar_url
                },
            };
        } catch (error) {
            console.error('Update avatar service error:', error);
            throw error;
        }
    },

    /**
     * Remove user avatar
     */
    removeAvatar: async (userId) => {
        try {
            const result = await Profile.update({ avatar_url: null }, { where: { user_id: userId } });

            if (result[0] === 0) {
                return {
                    status: 404,
                    message: 'Profile not found or no avatar to remove',
                };
            }

            return {
                status: 200,
                message: 'Avatar removed successfully',
                data: {
                    avatar_url: null,
                    filename: null
                },
            };
        } catch (error) {
            console.error('Remove avatar service error:', error);
            throw error;
        }
    },

    /**
     * Get profile by user ID
     */
    getProfileByUserId: async (userId) => {
        return await Profile.findOne({ where: { user_id: userId } });
    },

    /**
     * Update profile data
     */
    updateProfile: async (userId, profileData) => {
        return await Profile.update(profileData, { where: { user_id: userId } });
    },

    /**
     * Get user profile with related data
     */
    getUserProfile: async (userId) => {
        try {
            const user = await User.findOne({
                where: { id: userId },
                include: [
                    {
                        model: Profile,
                        as: 'profile',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    },
                ],
                attributes: { exclude: ['password', 'created_at', 'updated_at'] }
            });

            if (!user) {
                return {
                    status: 404,
                    message: 'User profile not found',
                };
            }

            return {
                status: 200,
                message: 'User profile fetched successfully',
                data: user,
            };
        } catch (error) {
            console.error('Get user profile service error:', error);
            throw error;
        }
    },

    /**
     * Get user dashboard data
     */
    getUserDashboard: async (userId) => {
        try {
            const user = await User.findOne({
                where: { id: userId },
                attributes: ['id', 'email', 'created_at'],
                include: [
                    {
                        model: Profile,
                        as: 'profile',
                        attributes: ['first_name', 'last_name', 'avatar_url']
                    },
                    {
                        model: Order,
                        as: 'orders',
                        attributes: ['id', 'status', 'total_amount', 'created_at'],
                        order: [['created_at', 'DESC']],
                        limit: 2,
                        required: false
                    }
                ],
            });

            if (!user) {
                return {
                    status: 404,
                    message: 'User profile not found',
                };
            }

            return {
                status: 200,
                message: 'User dashboard fetched successfully',
                data: user,
            };
        } catch (error) {
            console.error('Get user dashboard service error:', error);
            throw error;
        }
    },

    /**
     * Update user profile
     */
    updateUserProfile: async (userId, updateData) => {
        const transaction = await User.sequelize.transaction();

        try {
            const { email, profile: profileData } = updateData;

            // Prepare user update data
            const userUpdateData = {};
            if (email) userUpdateData.email = email;

            // Update user if there are changes
            if (Object.keys(userUpdateData).length > 0) {
                await User.update(userUpdateData, {
                    where: { id: userId },
                    transaction
                });
            }

            // Update profile if there are changes
            if (profileData && Object.keys(profileData).length > 0) {
                await Profile.update(profileData, {
                    where: { user_id: userId },
                    transaction
                });
            }

            await transaction.commit();

            // Get updated user data
            const updatedUser = await User.findOne({
                where: { id: userId },
                include: [
                    {
                        model: Profile,
                        as: 'profile',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ],
                attributes: { exclude: ['password', 'created_at', 'updated_at'] }
            });

            return {
                status: 200,
                message: 'Profile updated successfully',
                data: updatedUser
            };

        } catch (error) {
            await transaction.rollback();
            console.error('Update user profile service error:', error);
            throw error;
        }
    }

};

export default profileService;