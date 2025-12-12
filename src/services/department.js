import { Op } from "sequelize";
import { Department } from "../models/index.js";

const departmentService = {

    /**
     * Create a new department
     * @param {Object} departmentData - Department data
     * @returns {Promise<Object>} Created department
     */
    createDepartment: async (departmentData) => {

        try {
            const existingDepartment = await Department.findOne({
                where: { name: departmentData.name }
            });

            if (existingDepartment) {
                throw new Error('Department with this name already exists');
            }

            const department = await Department.create(departmentData);
            return {
                success: true,
                data: department,
                message: 'Department created successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Department name must be unique');
            }
            throw error;
        }
    },

    /**
     * Get all departments with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Departments data with metadata
     */
    getDepartments: async (options = {}) => {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                sortBy = 'name',
                sortOrder = 'ASC'
            } = options;

            const offset = (page - 1) * limit;

            const whereCondition = search ? {
                name: {
                    [Op.iLike]: `%${search}%`
                }
            } : {};

            const { count, rows: departments } = await Department.findAndCountAll({
                where: whereCondition,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: offset,
            });

            const totalPages = Math.ceil(count / limit);

            return {
                success: true,
                data: departments,
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
            throw new Error(`Failed to fetch departments: ${error.message}`);
        }
    },

    /**
     * Get department by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    getDepartmentById: async (id) => {
        try {
            const department = await Department.findByPk(id);

            if (!department) {
                throw new Error('Department not found');
            }

            return {
                success: true,
                data: department
            };
        } catch (error) {
            throw new Error(`Failed to fetch department: ${error.message}`);
        }
    },

    /**
     * Update department by ID
     * @param {number} id - Department ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated department
     */
    updateDepartment: async (id, updateData) => {
        try {
            const department = await Department.findByPk(id);

            if (!department) {
                throw new Error('Department not found');
            }

            if (updateData.name && updateData.name !== department.name) {
                const existingDepartment = await Department.findOne({
                    where: {
                        name: updateData.name,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingDepartment) {
                    throw new Error('Department with this name already exists');
                }
            }

            const updatedDepartment = await department.update(updateData, {
                returning: true,
                validate: true
            });

            return {
                success: true,
                data: updatedDepartment,
                message: 'Department updated successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Department name must be unique');
            }
            throw new Error(`Failed to update department: ${error.message}`);
        }
    },

    /**
     * Delete department by ID
     * @param {number} id 
     * @returns {Promise<Object>}
     */
    deleteDepartment: async (id) => {
        try {
            const department = await Department.findByPk(id);

            if (!department) {
                throw new Error('Department not found');
            }

            await department.destroy();

            return {
                success: true,
                message: 'Department deleted successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Cannot delete department because it is referenced by other records');
            }
            throw new Error(`Failed to delete department: ${error.message}`);
        }
    },

    /**
     * Bulk create departments
     * @param {Array} departmentsData
     * @returns {Promise<Object>}
     */
    bulkCreateDepartments: async (departmentsData) => {
        try {
            const departments = await Department.bulkCreate(departmentsData, {
                validate: true,
                ignoreDuplicates: true,
                returning: true
            });

            return {
                success: true,
                data: departments,
                message: 'Departments created successfully'
            };
        } catch (error) {
            throw new Error(`Failed to bulk create departments: ${error.message}`);
        }
    },

    /**
     * Check if department exists
     * @param {number} id - Department ID
     * @returns {Promise<boolean>} Existence check result
     */
    departmentExists: async (id) => {
        try {
            const count = await Department.count({ where: { id } });
            return count > 0;
        } catch (error) {
            throw new Error(`Failed to check department existence: ${error.message}`);
        }
    }

};

export default departmentService;