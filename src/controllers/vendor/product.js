import { validationResult } from "express-validator";
import productService from "../../services/product.js";
import { Product } from "../../models/index.js";
import { Op } from "sequelize";

/**
 * Handle product creation
 */
const createProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const result = await productService.createProduct(req.body);

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle getting all products
 */
const getProducts = async (req, res) => {
    try {

        const result = await productService.getProducts(req.query);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const getFilterCounts = async (req, res) => {
    try {
        const result = await productService.getFilterCounts(req.query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Handle getting product by ID
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await productService.getProductById(parseInt(id));

        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle getting product by item lookup code
 */
const getProductByItemLookupCode = async (req, res) => {
    try {
        const { itemLookupCode } = req.params;

        const result = await productService.getProductByItemLookupCode(itemLookupCode);

        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle product update
 */
const updateProduct = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const result = await productService.updateProduct(parseInt(id), req.body);

        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle product deletion
 */
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await productService.deleteProduct(parseInt(id));

        res.status(200).json(result);
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle bulk product creation
 */
const bulkCreateProducts = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const result = await productService.bulkCreateProducts(req.body.products, req.user.id);

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}

const exportProductsCSV = async (req, res) => {
    try {
        const products = await productService.exportProducts();

        if (products.length === 0) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
            res.write('ItemLookupCode,Description,Size,DepartmentID,Department,CategoryID,Category,Quantity,Price,SalePrice,Online_Price,Cost\n');
            return res.end();
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');

        const headers = [
            'ItemLookupCode',
            'Description',
            'Size',
            'DepartmentID',
            'Department',
            'CategoryID',
            'Category',
            'Quantity',
            'Price',
            'SalePrice',
            'Online_Price',
            'Cost'
        ];

        res.write(headers.join(',') + '\n');

        for (const product of products) {
            const row = [
                product.ItemLookupCode,
                `"${(product.Description || '').replace(/"/g, '""')}"`,
                product.Size,
                product.DepartmentID,
                product.Department,
                product.CategoryID,
                product.Category,
                product.Quantity,
                product.Price,
                product.SalePrice,
                product.Online_Price,
                product.Cost
            ];

            res.write(row.join(',') + '\n');
        }

        res.end();

    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to export products as CSV',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        } else {
            res.end();
        }
    }
};

/**
 * Handle getting low stock products
 */
const getLowStockProducts = async (req, res) => {
    try {
        // const vendorId = req.user.id;
        const { threshold = 10 } = req.query;

        const products = await Product.findAll({
            where: {
                // vendor_id: vendorId,
                quantity: {
                    [Op.lte]: Number(threshold)
                },
                status: 'active'
            },
            order: [['quantity', 'ASC']],
            limit: 20
        });

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export {
    createProduct,
    getProducts,
    getFilterCounts,
    getProductById,
    getProductByItemLookupCode,
    updateProduct,
    deleteProduct,
    bulkCreateProducts,
    getLowStockProducts,
    exportProductsCSV
};