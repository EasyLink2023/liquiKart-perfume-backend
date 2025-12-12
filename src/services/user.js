import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { User, Profile } from "../models/index.js";

const userService = {

    findUserByEmail: async (email) => {
        return await User.findOne({ where: { email } });
    },

    isEmailExists: async (email) => {
        const user = await User.findOne({ where: { email } });
        return !!user;
    },

    getUserWithProfile: async (userId) => {
        return await User.findByPk(userId, {
            include: [{
                model: Profile,
                as: 'profile',
                attributes: ["first_name", "last_name", "phone", "avatar_url"]
            }]
        });
    },

    createUser: async (userData) => {
        const transaction = await sequelize.transaction();

        try {

            const user = await User.create(
                userData,
                {
                    include: [
                        { model: Profile, as: "profile" },
                    ],
                    transaction
                });

            await transaction.commit();

            const completeUser = await User.findByPk(user.id, {
                include: [{
                    model: Profile,
                    as: 'profile',
                    attributes: { exclude: ['user_id'] }
                }],
                attributes: { exclude: ['password'] }
            });

            return {
                success: true,
                data: completeUser,
                message: 'User created successfully'
            };

        } catch (error) {
            await transaction.rollback();

            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Email already exists');
            }
            throw new Error(`Failed to create user: ${error.message}`);
        }
    },

    getUsers: async (options = {}) => {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                role = '',
                is_active = '',
                sortBy = 'created_at',
                sortOrder = 'DESC'
            } = options;

            const offset = (page - 1) * limit;

            const whereCondition = {};
            const profileWhereCondition = {};

            if (search) {
                profileWhereCondition[Op.or] = [
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } }
                ];
                whereCondition[Op.or] = [
                    { email: { [Op.iLike]: `%${search}%` } },
                    { company_name: { [Op.iLike]: `%${search}%` } }
                ];
            }

            if (role) {
                whereCondition.role = role;
            }

            if (is_active !== '') {
                whereCondition.is_active = is_active === 'true';
            }

            const { count, rows: users } = await User.findAndCountAll({
                where: whereCondition,
                include: [{
                    model: Profile,
                    as: 'profile',
                    where: profileWhereCondition,
                    required: false
                }],
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset,
                attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] }
            });

            const totalPages = Math.ceil(count / limit);

            return {
                success: true,
                data: users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
    },

    getUserById: async (id) => {
        try {
            const user = await User.findByPk(id, {
                include: [{
                    model: Profile,
                    as: 'profile',
                    attributes: { exclude: ['user_id'] }
                }],
                attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] }
            });

            if (!user) throw new Error('User not found');

            return { success: true, data: user };
        } catch (error) {
            throw new Error(`Failed to fetch user: ${error.message}`);
        }
    },

    updateUser: async (id, updateData) => {
        const transaction = await sequelize.transaction();

        try {
            const user = await User.findByPk(id, { transaction });
            if (!user) throw new Error('User not found');

            const { profile, ...userFields } = updateData;

            // Update password using the instance method to trigger hooks
            if (userFields.password) await user.updatePassword(newPassword);

            await user.update(userFields, { transaction, validate: true });

            if (profile) {
                const existingProfile = await Profile.findOne({
                    where: { user_id: id },
                    transaction
                });

                if (existingProfile) {
                    await existingProfile.update(profile, { transaction });
                } else {
                    await Profile.create({ ...profile, user_id: id }, { transaction });
                }
            }

            await transaction.commit();

            const updatedUser = await User.findByPk(id, {
                include: [{
                    model: Profile,
                    as: 'profile',
                    attributes: { exclude: ['user_id'] }
                }],
                attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires'] }
            });

            return {
                success: true,
                data: updatedUser,
                message: 'User updated successfully'
            };
        } catch (error) {
            await transaction.rollback();

            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Email already exists');
            }
            throw new Error(`Failed to update user: ${error.message}`);
        }
    },

    deleteUser: async (id) => {
        const transaction = await sequelize.transaction();

        try {
            const user = await User.findByPk(id, { transaction });
            if (!user) throw new Error('User not found');

            await Profile.destroy({ where: { user_id: id }, transaction });
            await user.destroy({ transaction });

            await transaction.commit();

            return {
                success: true,
                message: 'User deleted successfully'
            };
        } catch (error) {
            await transaction.rollback();

            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Cannot delete user because it is referenced by other records');
            }

            throw new Error(`Failed to delete user: ${error.message}`);
        }
    },

    toggleUserStatus: async (id) => {
        try {
            const user = await User.findByPk(id);
            if (!user) throw new Error('User not found');

            user.is_active = !user.is_active;
            await user.save();

            return {
                success: true,
                data: user,
                message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`
            };
        } catch (error) {
            throw new Error(`Failed to toggle user status: ${error.message}`);
        }
    },

    userExists: async (id) => {
        try {
            const count = await User.count({ where: { id } });
            return count > 0;
        } catch (error) {
            throw new Error(`Failed to check user existence: ${error.message}`);
        }
    }
};

export default userService;