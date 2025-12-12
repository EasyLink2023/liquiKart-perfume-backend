import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Product, ProductImage, Category, Department } from "../models/index.js";

const productService = {

    /**
     * Create a new product
     * @param {Object} productData
     * @returns {Promise<Object>}
     */
    createProduct: async (productData) => {
        try {
            const existingProduct = await Product.findOne({
                where: { item_lookup_code: productData.item_lookup_code }
            });

            if (existingProduct) {
                throw new Error('Product with this item lookup code already exists');
            }

            const { images, ...productWithoutImages } = productData;

            const result = await sequelize.transaction(async (t) => {
                const product = await Product.create(productWithoutImages, {
                    transaction: t
                });

                if (images && images.length > 0) {
                    const imagesData = images.map(image => ({
                        ...image,
                        ur: process.env.SERVER_URL + image?.url,
                        product_id: product.id
                    }));

                    await ProductImage.bulkCreate(imagesData, {
                        transaction: t,
                        validate: true
                    });
                }

                // Return product with images
                return await Product.findByPk(product.id, {
                    include: [{
                        model: ProductImage,
                        as: 'images'
                    }],
                    transaction: t
                });
            });

            return {
                success: true,
                data: result,
                message: (images && images.length > 0) ?
                    "Product created successfully with images" :
                    "Product created successfully"
            };
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Product item lookup code must be unique');
            }
            throw error;
        }
    },

    /**
     * Get all products with pagination and filtering
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    getProducts: async (options) => {
        try {
            const {
                page = 1,
                limit = 12,
                search = '',
                category_id,
                category_names,
                status = 'active',
                sortBy = 'created_at',
                sortOrder = 'DESC',
                minPrice,
                maxPrice,
                inStock = false,
                onSale = false,
                newArrivals = false
            } = options;

            const offset = (page - 1) * limit;

            const whereCondition = { status };

            if (search) {
                whereCondition[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { item_lookup_code: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } },
                ];
            }

            let categoryIncludeCondition = {};
            if (category_names) {
                const categoryNamesArray = Array.isArray(category_names)
                    ? category_names
                    : category_names.split(',');

                if (categoryNamesArray.length > 0) {
                    categoryIncludeCondition = {
                        name: {
                            [Op.in]: categoryNamesArray.map(name => name.trim())
                        }
                    };
                }
            }

            if (category_id) whereCondition.category_id = category_id;

            if (minPrice !== undefined || maxPrice !== undefined) {
                whereCondition[Op.and] = whereCondition[Op.and] || [];

                const priceCondition = {};
                if (minPrice !== undefined) priceCondition[Op.gte] = parseFloat(minPrice);
                if (maxPrice !== undefined) priceCondition[Op.lte] = parseFloat(maxPrice);

                whereCondition[Op.and].push({
                    [Op.or]: [
                        {
                            [Op.and]: [
                                { sale_price: { [Op.ne]: null } },
                                { sale_price: { [Op.gt]: 0 } },
                                { sale_price: priceCondition }
                            ]
                        },
                        {
                            [Op.and]: [
                                {
                                    [Op.or]: [
                                        { sale_price: null },
                                        { sale_price: 0 },
                                        { sale_price: { [Op.lte]: 0 } }
                                    ]
                                },
                                { price: priceCondition }
                            ]
                        }
                    ]
                });
            }

            if (inStock) whereCondition.quantity = { [Op.gt]: 0 };

            if (onSale) {
                whereCondition[Op.and] = whereCondition[Op.and] || [];
                whereCondition[Op.and].push({
                    sale_price: {
                        [Op.ne]: null,
                        [Op.gt]: 0
                    }
                });
            }

            if (newArrivals) {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                whereCondition.createdAt = { [Op.gte]: thirtyDaysAgo };
            }

            const include = [
                {
                    model: ProductImage,
                    as: 'images',
                    attributes: ['id', 'url', 'is_primary'],
                    required: false
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'image_url'],
                    where: categoryIncludeCondition,
                    required: !!category_names
                }
            ];

            const countQuery = {
                where: whereCondition,
                include: include,
                distinct: true,
                col: 'id'
            };

            const productsQuery = {
                where: whereCondition,
                include: include,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: offset,
                distinct: true
            };

            const [count, products] = await Promise.all([
                Product.count(countQuery),
                Product.findAll(productsQuery)
            ]);

            const totalPages = Math.ceil(count / limit);

            const response = {
                success: true,
                data: products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };

            return response;

        } catch (error) {
            console.error('Error fetching products:', error);
            throw new Error(`Failed to fetch products: ${error.message}`);
        }
    },

    getFilterCounts: async () => {
        try {
            const allProducts = await Product.findAll({
                where: { status: 'active' },
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name'],
                        required: false
                    }
                ]
            });

            const inStockCount = allProducts.filter(p => p.quantity > 0).length;
            const onSaleCount = allProducts.filter(p => p.sale_price && p.sale_price > 0).length;

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const newArrivalsCount = allProducts.filter(p => {
                return p.createdAt && new Date(p.createdAt) >= thirtyDaysAgo;
            }).length;

            const categoryCounts = {};
            allProducts.forEach(product => {
                if (product.category?.name) {
                    const categoryName = product.category.name;
                    categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
                }
            });

            const filterCounts = {
                inStock: inStockCount,
                onSale: onSaleCount,
                newArrivals: newArrivalsCount,
                categories: categoryCounts,
                total: allProducts.length
            };

            return {
                success: true,
                data: filterCounts
            };

        } catch (error) {
            console.error('Error fetching filter counts:', error);
            throw new Error(`Failed to fetch filter counts: ${error.message}`);
        }
    },

    /**
     * Get product by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    getProductById: async (id) => {
        try {
            const product = await Product.findByPk(id, {
                include: [
                    {
                        model: ProductImage,
                        as: 'images',
                        attributes: ['id', 'url', 'is_primary', 'created_at']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name']
                    }
                ]
            });

            if (!product) {
                throw new Error('Product not found');
            }

            return {
                success: true,
                data: product
            };
        } catch (error) {
            throw new Error(`Failed to fetch product: ${error.message}`);
        }
    },

    /**
     * Get product by item lookup code
     * @param {string} itemLookupCode
     * @returns {Promise<Object>}
     */
    getProductByItemLookupCode: async (itemLookupCode) => {
        try {
            const product = await Product.findOne({
                where: { item_lookup_code: itemLookupCode },
                include: [
                    {
                        model: ProductImage,
                        as: 'images',
                        attributes: ['id', 'url', 'is_primary']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name']
                    }
                ]
            });

            if (!product) {
                throw new Error('Product not found');
            }

            return {
                success: true,
                data: product
            };
        } catch (error) {
            throw new Error(`Failed to fetch product: ${error.message}`);
        }
    },

    /**
     * Update product by ID
     * @param {number} id
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    updateProduct: async (id, updateData) => {
        try {
            const product = await Product.findByPk(id);

            if (!product) {
                throw new Error('Product not found');
            }

            if (updateData.item_lookup_code && updateData.item_lookup_code !== product.item_lookup_code) {
                const existingProduct = await Product.findOne({
                    where: {
                        item_lookup_code: updateData.item_lookup_code,
                        id: { [Op.ne]: id }
                    }
                });

                if (existingProduct) {
                    throw new Error('Product with this item lookup code already exists');
                }
            }

            const updatedProduct = await product.update(updateData, {
                returning: true,
                validate: true
            });

            return {
                success: true,
                data: updatedProduct,
                message: 'Product updated successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Product item lookup code must be unique');
            }
            throw new Error(`Failed to update product: ${error.message}`);
        }
    },

    /**
     * Delete product by ID
     * @param {number} id
     * @returns {Promise<Object>}
     */
    deleteProduct: async (id) => {
        try {
            const product = await Product.findByPk(id);

            if (!product) {
                throw new Error('Product not found');
            }

            await product.destroy();

            return {
                success: true,
                message: 'Product deleted successfully'
            };
        } catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error('Cannot delete product because it is referenced by other records');
            }
            throw new Error(`Failed to delete product: ${error.message}`);
        }
    },

    /**
     * Get low stock products
     * @param {number} threshold
     * @returns {Promise<Object>}
     */
    getLowStockProducts: async (threshold = 10) => {
        try {
            const products = await Product.findAll({
                where: {
                    quantity: {
                        [Op.lte]: threshold
                    },
                    status: 'active'
                },
                include: [
                    {
                        model: ProductImage,
                        as: 'images',
                        attributes: ['id', 'url', 'is_primary']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['quantity', 'ASC']]
            });

            return {
                success: true,
                data: products,
                message: `Found ${products.length} products with low stock`
            };
        } catch (error) {
            throw new Error(`Failed to fetch low stock products: ${error.message}`);
        }
    },

    /**
    * Bulk create products with upsert functionality
    * @param {Array} productsData
    * @returns {Promise<Object>}
    */
    bulkCreateProducts: async (productsData, vendor_id) => {
        const transaction = await sequelize.transaction();

        const results = {
            success: true,
            data: [],
            message: "",
            stats: {
                total: productsData.length,
                created: 0,
                updated: 0,
                skipped: 0,
                errors: []
            }
        };

        try {
            const existingDepartments = await Department.findAll({ transaction });
            const existingCategories = await Category.findAll({ transaction });
            const existingProducts = await Product.findAll({
                where: {
                    item_lookup_code: productsData.map(p => p.item_lookup_code)
                },
                transaction
            });

            const departmentMap = new Map();
            const categoryMap = new Map();
            const productMap = new Map();

            existingDepartments.forEach(dept => {
                departmentMap.set(dept.id, dept);
                departmentMap.set(dept.name.toLowerCase(), dept);
            });

            existingCategories.forEach(cat => {
                const key = `${cat.department_id}-${cat.name.toLowerCase()}`;
                categoryMap.set(cat.id, cat);
                categoryMap.set(key, cat);
            });

            existingProducts.forEach(prod => {
                productMap.set(prod.item_lookup_code, prod);
            });

            const BATCH_SIZE = 100;

            for (let i = 0; i < productsData.length; i += BATCH_SIZE) {
                const batch = productsData.slice(i, i + BATCH_SIZE);

                for (const [batchIndex, productData] of batch.entries()) {
                    const globalIndex = i + batchIndex;

                    try {
                        let departmentId;
                        let departmentName;

                        if (productData.department_id) {
                            departmentId = Number(productData.department_id);
                            const existingDept = departmentMap.get(departmentId);

                            if (existingDept) {
                                departmentName = existingDept.name;
                            } else if (productData.department_name) {
                                departmentName = productData.department_name.trim();
                                const newDept = await Department.create({
                                    id: departmentId,
                                    name: departmentName
                                }, { transaction });
                                departmentMap.set(departmentId, newDept);
                                departmentMap.set(departmentName.toLowerCase(), newDept);
                            } else {
                                throw new Error(`Department ID ${departmentId} not found`);
                            }
                        } else if (productData.department_name) {
                            departmentName = productData.department_name.trim();
                            const existingDept = departmentMap.get(departmentName.toLowerCase());

                            if (existingDept) {
                                departmentId = existingDept.id;
                            } else {
                                const newDept = await Department.create({
                                    name: departmentName
                                }, { transaction });
                                departmentId = newDept.id;
                                departmentMap.set(departmentId, newDept);
                                departmentMap.set(departmentName.toLowerCase(), newDept);
                            }
                        } else {
                            throw new Error('Department information required');
                        }

                        let categoryId;
                        let categoryName;

                        if (productData.category_id) {
                            categoryId = Number(productData.category_id);
                            const existingCat = categoryMap.get(categoryId);

                            if (existingCat) {
                                if (existingCat.department_id !== departmentId) {
                                    throw new Error(`Category belongs to different department`);
                                }
                                categoryName = existingCat.name;
                            } else if (productData.category_name) {
                                categoryName = productData.category_name.trim();
                                const newCategory = await Category.create({
                                    id: categoryId,
                                    name: categoryName,
                                    department_id: departmentId,
                                    description: categoryName
                                }, { transaction });
                                categoryMap.set(categoryId, newCategory);
                                const key = `${departmentId}-${categoryName.toLowerCase()}`;
                                categoryMap.set(key, newCategory);
                            } else {
                                throw new Error(`Category ID ${categoryId} not found`);
                            }
                        } else if (productData.category_name) {
                            categoryName = productData.category_name.trim();
                            const key = `${departmentId}-${categoryName.toLowerCase()}`;
                            const existingCat = categoryMap.get(key);

                            if (existingCat) {
                                categoryId = existingCat.id;
                            } else {
                                const newCategory = await Category.create({
                                    name: categoryName,
                                    department_id: departmentId,
                                    description: categoryName
                                }, { transaction });
                                categoryId = newCategory.id;
                                categoryMap.set(categoryId, newCategory);
                                categoryMap.set(key, newCategory);
                            }
                        } else {
                            throw new Error('Category information required');
                        }

                        const existingProduct = productMap.get(productData.item_lookup_code);

                        const payload = {
                            item_lookup_code: productData.item_lookup_code,
                            name: productData.name || productData.item_lookup_code,
                            description: productData.description || productData.name || productData.item_lookup_code,
                            size: productData.size || "750ML",
                            category_id: categoryId,
                            price: parseFloat(productData.price),
                            sale_price: parseFloat(productData.sale_price) || 0,
                            online_price: parseFloat(productData.online_price) || parseFloat(productData.price),
                            cost: parseFloat(productData.cost) || 0,
                            quantity: parseInt(productData.quantity) || 0,
                            status: productData.status || "active",
                            vendor_id: vendor_id
                        };

                        let product;
                        if (existingProduct) {
                            product = await existingProduct.update(payload, { transaction });
                            results.stats.updated++;
                        } else {
                            product = await Product.create(payload, { transaction });
                            results.stats.created++;
                            productMap.set(productData.item_lookup_code, product);
                        }

                    } catch (error) {
                        results.stats.skipped++;
                        results.stats.errors.push({
                            row: globalIndex + 1,
                            item_lookup_code: productData.item_lookup_code,
                            error: error.message
                        });
                    }
                }
            }

            await transaction.commit();

            results.message = `Bulk operation completed: ${results.stats.created} created, ${results.stats.updated} updated, ${results.stats.skipped} skipped.`;

            return results;

        } catch (error) {
            await transaction.rollback();
            throw new Error(`Failed to bulk create products: ${error.message}`);
        }
    },

    exportProducts: async () => {
        try {
            const countResult = await sequelize.query(
                'SELECT COUNT(*) as total FROM products',
                { type: sequelize.QueryTypes.SELECT }
            );

            const totalProducts = countResult[0].total;

            if (totalProducts === 0) {
                return [];
            }

            const query = `
                SELECT 
                    p.id,
                    p.item_lookup_code AS "itemLookupCode",
                    p.description,
                    p.size,
                    p.quantity,
                    p.price,
                    p.sale_price AS "salePrice",
                    p.online_price AS "onlinePrice",
                    p.cost,
                    p.category_id AS "categoryId",
                    c.name AS "categoryName",
                    c.department_id AS "departmentId",
                    d.name AS "departmentName",
                    p.created_at AS "createdAt",
                    p.updated_at AS "updatedAt"
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN departments d ON c.department_id = d.id
                ORDER BY p.id
            `;

            const result = await sequelize.query(query, {
                type: sequelize.QueryTypes.SELECT
            });

            if (result.length === 0) {
                return [];
            }

            return result.map((row) => ({
                ItemLookupCode: row.itemLookupCode || '',
                Description: row.description || '',
                Size: row.size || '',
                DepartmentID: row.departmentId || '',
                Department: row.departmentName || '',
                CategoryID: row.categoryId || '',
                Category: row.categoryName || '',
                Quantity: row.quantity || 0,
                Price: row.price || 0,
                SalePrice: row.salePrice || 0,
                Online_Price: row.onlinePrice || 0,
                Cost: row.cost || 0
            }));

        } catch (error) {
            throw new Error(`Failed to export products: ${error.message}`);
        }
    }
};

export default productService;