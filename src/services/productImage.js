import { Product, ProductImage } from "../models/index.js";

const productImageService = {

    /**
     * Get all product images for a product
     */
    getAllProductImages: async (productId) => {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const images = await ProductImage.findAll({
                where: { product_id: productId },
                order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
            });

            return {
                success: true,
                data: images
            };
        } catch (error) {
            throw new Error(`Failed to fetch product images: ${error.message}`);
        }
    },

    /**
     * 1. Bulk insert - Insert bulk data directly
     */
    bulkInsert: async (productId, images) => {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Create all images
            const createdImages = await ProductImage.bulkCreate(
                images.map(imageData => ({
                    ...imageData,
                    url:
                        imageData?.url.startsWith(process.env.SERVER_URL) ?
                            imageData?.url : process.env.SERVER_URL + imageData?.url,
                    product_id: productId
                }))
            );

            return {
                success: true,
                data: createdImages,
                message: `${createdImages.length} images inserted successfully`
            };
        } catch (error) {
            throw new Error(`Failed to bulk insert product images: ${error.message}`);
        }
    },

    /**
     * 2. Bulk delete - Delete all records for the received product_id
     */
    bulkDelete: async (productId) => {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const deletedCount = await ProductImage.destroy({
                where: { product_id: productId }
            });

            return {
                success: true,
                data: { deletedCount },
                message: `${deletedCount} images deleted successfully`
            };
        } catch (error) {
            throw new Error(`Failed to bulk delete product images: ${error.message}`);
        }
    },

    /**
     * 3. Add or Update - Check the array, if exists update, new add, rest delete
     */
    addOrUpdate: async (productId, images) => {
        try {
            const product = await Product.findByPk(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Get existing images for this product
            const existingImages = await ProductImage.findAll({
                where: { product_id: productId }
            });

            const existingImageMap = new Map();
            existingImages.forEach(img => {
                existingImageMap.set(img.id, img);
            });

            const imagesToCreate = [];
            const imagesToUpdate = [];
            const imagesToDelete = new Set(existingImages.map(img => img.id));

            // Process each image from the request
            for (const imageData of images) {
                if (imageData.id && existingImageMap.has(imageData.id)) {
                    // Existing image - update
                    imagesToUpdate.push({
                        id: imageData.id,
                        updates: imageData
                    });
                    imagesToDelete.delete(imageData.id);
                } else {
                    // New image - create
                    imagesToCreate.push(imageData);
                }
            }

            // Start transaction for atomic operations
            const transaction = await ProductImage.sequelize.transaction();

            try {
                // Delete images that are no longer in the request
                let deletedCount = 0;
                if (imagesToDelete.size > 0) {
                    const result = await ProductImage.destroy({
                        where: {
                            id: Array.from(imagesToDelete),
                            product_id: productId
                        },
                        transaction
                    });
                    deletedCount = result;
                }

                // Check if any image is marked as primary
                const hasPrimary = images.some(img => img.is_primary);

                if (hasPrimary) {
                    // Reset all primary images first
                    await ProductImage.update(
                        { is_primary: false },
                        {
                            where: { product_id: productId },
                            transaction
                        }
                    );
                }

                // Create new images
                const createdImages = [];
                if (imagesToCreate.length > 0) {
                    const newImages = await ProductImage.bulkCreate(
                        imagesToCreate.map(imageData => ({
                            ...imageData,
                            url: imageData?.url.startsWith(process.env.SERVER_URL) ? imageData?.url : process.env.SERVER_URL + imageData?.url,
                            product_id: productId
                        })),
                        { transaction }
                    );
                    createdImages.push(...newImages);
                }

                // Update existing images
                const updatedImages = [];
                if (imagesToUpdate.length > 0) {
                    const updatePromises = imagesToUpdate.map(({ id, updates }) =>
                        ProductImage.update(
                            {
                                ...updates,
                                url: updates?.url.startsWith(process.env.SERVER_URL) ? updates?.url : process.env.SERVER_URL + updates?.url,
                            },
                            {
                                where: { id, product_id: productId },
                                transaction
                            })
                    );
                    await Promise.all(updatePromises);

                    // Fetch updated images
                    const updatedImageIds = imagesToUpdate.map(img => img.id);
                    const fetchedUpdatedImages = await ProductImage.findAll({
                        where: { id: updatedImageIds },
                        transaction
                    });
                    updatedImages.push(...fetchedUpdatedImages);
                }

                await transaction.commit();

                return {
                    success: true,
                    data: {
                        created: createdImages.length,
                        updated: updatedImages.length,
                        deleted: deletedCount
                    },
                    message: `Images processed successfully: ${createdImages.length} created, ${updatedImages.length} updated, ${deletedCount} deleted`
                };

            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            throw new Error(`Failed to add or update product images: ${error.message}`);
        }
    }

};

export default productImageService;