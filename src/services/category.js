import { Op } from "sequelize";
import { Category, Department } from "../models/index.js";

const categoryService = {

    /**
     * Create a new category
     * @param {Object} categoryData
     * @returns {Promise<Object>}
     */
    createCategory: async (categoryData) => {
        try {
            const { name, department_id, description, image_url } = categoryData;
            image_url = process.env.SERVER_URL + image_url;

            if (!name || !department_id) {
                throw new Error('Name and department_id are required');
            }

            const existingCategory = await Category.findOne({
                where: {
                    name,
                    department_id
                }
            });

            if (existingCategory) {
                throw new Error('Category with this name already exists in this department');
            }

            const category = await Category.create({
                name,
                department_id,
                description,
                image_url
            });

            // Reload with department data
            const categoryWithDepartment = await Category.findByPk(category.id, {
                include: [{ model: Department, as: 'department' }]
            });

            return {
                success: true,
                data: categoryWithDepartment,
                message: 'Category created successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Invalid department ID');
            }
            throw error;
        }
    },

    /**
     * Get all categories with pagination and filtering
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    getCategories: async (options = {}) => {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                sortBy = 'name',
                sortOrder = 'ASC',
                departmentId = null,
                department_names
            } = options;

            const offset = (page - 1) * limit;

            const whereCondition = {};

            if (search) {
                whereCondition[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            if (departmentId !== null && departmentId !== '') {
                whereCondition.department_id = departmentId;
            }

            let departmentIncludeCondition = {};
            if (department_names) {
                const departmentNamesArray = Array.isArray(department_names)
                    ? department_names
                    : department_names.split(',');

                if (departmentNamesArray.length > 0) {
                    departmentIncludeCondition = {
                        name: {
                            [Op.in]: departmentNamesArray.map(name => name.trim())
                        }
                    };
                }
            }

            const { count, rows: categories } = await Category.findAndCountAll({
                where: whereCondition,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: offset,
                include: [
                    {
                        model: Department,
                        as: 'department',
                        where: departmentIncludeCondition,
                        required: !!department_names
                    }
                ]
            });

            const totalPages = Math.ceil(count / limit);

            return {
                success: true,
                data: categories,
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
            throw new Error(`Failed to fetch categories: ${error.message}`);
        }
    },

    /**
     * Get category by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    getCategoryById: async (id) => {
        try {
            const category = await Category.findByPk(id, {
                include: [{ model: Department, as: 'department' }]
            });

            if (!category) {
                throw new Error('Category not found');
            }

            return {
                success: true,
                data: category
            };
        } catch (error) {
            throw new Error(`Failed to fetch category: ${error.message}`);
        }
    },

    /**
     * Update category by ID
     * @param {number} id
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    updateCategory: async (id, updateData) => {
        try {
            const category = await Category.findByPk(id);

            if (!category) {
                throw new Error('Category not found');
            }

            if (updateData.name && updateData.name !== category.name) {
                const existingCategory = await Category.findOne({
                    where: {
                        name: updateData.name,
                        department_id: updateData.department_id || category.department_id,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingCategory) {
                    throw new Error('Category with this name already exists in this department');
                }
            }

            if (updateData?.image_url.startsWith(process.env.SERVER_URL)) updateData.image_url = updateData?.image_url;
            else updateData.image_url = process.env.SERVER_URL + updateData?.image_url;

            await category.update(updateData, {
                validate: true
            });

            // Reload with department data
            const updatedCategory = await Category.findByPk(id, {
                include: [{ model: Department, as: 'department' }]
            });

            return {
                success: true,
                data: updatedCategory,
                message: 'Category updated successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Invalid department ID');
            }
            throw new Error(`Failed to update category: ${error.message}`);
        }
    },

    /**
     * Delete category by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    deleteCategory: async (id) => {
        try {
            const category = await Category.findByPk(id);

            if (!category) {
                throw new Error('Category not found');
            }

            await category.destroy();

            return {
                success: true,
                message: 'Category deleted successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Cannot delete category. It is being used by other records.');
            }
            throw new Error(`Failed to delete category: ${error.message}`);
        }
    },

    /**
     * Get categories by department ID
     * @param {number} department_id
     * @returns {Promise<Object>}
     */
    getCategoriesByDepartment: async (department_id) => {
        try {
            const categories = await Category.findAll({
                where: { department_id },
                include: [{ model: Department, as: 'department' }],
                order: [['name', 'ASC']]
            });

            return {
                success: true,
                data: categories
            };
        } catch (error) {
            throw new Error(`Failed to fetch categories by department: ${error.message}`);
        }
    },

    /**
     * Bulk create categories
     * @param {Array} categoriesData
     * @returns {Promise<Object>}
     */
    bulkCreateCategories: async (categoriesData) => {
        try {
            if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
                throw new Error('Categories data must be a non-empty array');
            }

            // Validate all categories before creation
            for (const [index, category] of categoriesData.entries()) {
                if (!category.name || !category.department_id) {
                    throw new Error(`Category at index ${index} is missing required fields (name or department_id)`);
                }

                const existingCategory = await Category.findOne({
                    where: {
                        name: category.name,
                        department_id: category.department_id
                    }
                });

                if (existingCategory) {
                    throw new Error(`Category "${category.name}" already exists in department ${category.department_id} at index ${index}`);
                }
            }

            // Create all categories
            const createdCategories = await Category.bulkCreate(categoriesData, {
                validate: true,
                returning: true
            });

            // Fetch created categories with department data
            const categoryIds = createdCategories.map(cat => cat.id);
            const categoriesWithDepartment = await Category.findAll({
                where: { id: { [Op.in]: categoryIds } },
                include: [{ model: Department, as: 'department' }]
            });

            return {
                success: true,
                data: categoriesWithDepartment,
                message: `${createdCategories.length} categories created successfully`
            };
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Duplicate category name found in the same department');
            }
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Invalid department ID found in categories data');
            }
            throw new Error(`Failed to bulk create categories: ${error.message}`);
        }
    }

};

export default categoryService;