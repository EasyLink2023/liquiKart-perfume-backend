import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Address } from "../models/index.js";

const addressService = {
  /**
   * Create a new address
   */
  async createAddress(data, transaction = null) {
    const { user_id, is_default = false, ...addressData } = data;

    // Start transaction if not provided
    const t = transaction || await sequelize.transaction();

    try {
      // If creating default, unset other defaults first
      if (is_default) {
        await Address.update(
          { is_default: false },
          {
            where: { user_id, is_active: true },
            transaction: t
          }
        );
      }

      const address = await Address.create({
        ...addressData,
        user_id,
        is_default
      }, { transaction: t });

      if (!transaction) await t.commit();

      return address;
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  },

  /**
   * Get all active addresses for a user with pagination
   */
  async getAddressesByUser(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      includeInactive = false,
      type = null
    } = options;

    const whereClause = { user_id: userId };

    if (!includeInactive) {
      whereClause.is_active = true;
    }

    if (type) {
      whereClause.type = type;
    }

    const { count, rows } = await Address.findAndCountAll({
      where: whereClause,
      order: [
        ['is_default', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    return {
      addresses: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  },

  /**
   * Get address by ID (must belong to user)
   */
  async getAddressById(id, userId, includeInactive = false) {
    const whereClause = { id, user_id: userId };

    if (!includeInactive) {
      whereClause.is_active = true;
    }

    const address = await Address.findOne({ where: whereClause });

    if (!address) {
      throw new Error('Address not found');
    }

    return address;
  },

  /**
   * Update an address
   */
  async updateAddress(id, userId, data, transaction = null) {
    const { is_default, ...updateData } = data;

    // Start transaction if not provided
    const t = transaction || await sequelize.transaction();

    try {
      const address = await Address.findOne({
        where: { id, user_id: userId, is_active: true },
        transaction: t
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // If setting as default, unset others
      if (is_default) {
        await Address.update(
          { is_default: false },
          {
            where: { user_id: userId, is_active: true },
            transaction: t
          }
        );
      }

      await address.update({
        ...updateData,
        ...(is_default !== undefined && { is_default })
      }, { transaction: t });

      if (!transaction) await t.commit();

      return address;
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  },

  /**
   * Soft delete an address
   */
  async deleteAddress(id, userId, transaction = null) {
    const t = transaction || await sequelize.transaction();

    try {
      const address = await Address.findOne({
        where: { id, user_id: userId, is_active: true },
        transaction: t
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // If deleting default address, set another as default
      if (address.is_default) {
        const anotherAddress = await Address.findOne({
          where: {
            user_id: userId,
            id: { [Op.ne]: id },
            is_active: true
          },
          order: [['created_at', 'DESC']],
          transaction: t
        });

        if (anotherAddress) {
          await anotherAddress.update({ is_default: true }, { transaction: t });
        }
      }

      await address.update({ is_active: false }, { transaction: t });

      if (!transaction) await t.commit();

      return true;
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  },

  /**
   * Set address as default
   */
  async setDefaultAddress(id, userId, transaction = null) {
    const t = transaction || await sequelize.transaction();

    try {
      const address = await Address.findOne({
        where: { id, user_id: userId, is_active: true },
        transaction: t
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // Set is_default = false for all addresses of this user
      await Address.update(
        { is_default: false },
        {
          where: { user_id: userId, is_active: true },
          transaction: t
        }
      );

      // Set the chosen address as default
      await address.update({ is_default: true }, { transaction: t });

      if (!transaction) await t.commit();

      return address;
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  },

  /**
   * Get user's default address
   */
  async getDefaultAddress(userId) {
    return await Address.findOne({
      where: {
        user_id: userId,
        is_default: true,
        is_active: true
      }
    });
  },

  /**
   * Restore soft-deleted address
   */
  async restoreAddress(id, userId) {
    const address = await Address.findOne({
      where: { id, user_id: userId, is_active: false }
    });

    if (!address) {
      throw new Error('Address not found or already active');
    }

    await address.update({ is_active: true });
    return address;
  },

  /**
   * Count user's active addresses
   */
  async countUserAddresses(userId) {
    return await Address.count({
      where: { user_id: userId, is_active: true }
    });
  }
};

export default addressService;