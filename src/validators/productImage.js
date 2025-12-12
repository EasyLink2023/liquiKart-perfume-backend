import { body, param } from 'express-validator';

export const productImageBulkValidation = [

    param('productId')
        .isInt({ min: 1 })
        .withMessage('Valid product ID is required'),

    body('images')
        .isArray({ min: 1 })
        .withMessage('Images must be a non-empty array')
        .custom((images) => {
            for (const image of images) {
                if (!image.url || typeof image.url !== 'string') {
                    throw new Error('Each image must have a valid URL');
                }
                if (image.is_primary && typeof image.is_primary !== 'boolean') {
                    throw new Error('is_primary must be a boolean');
                }
            }
            return true;
        })
        
];

export const productImageAddOrUpdateValidation = [

    param('productId')
        .isInt({ min: 1 })
        .withMessage('Valid product ID is required'),

    body('images')
        .isArray()
        .withMessage('Images must be an array')
        .custom((images) => {
            for (const image of images) {
                if (!image.url || typeof image.url !== 'string') {
                    throw new Error('Each image must have a valid URL');
                }
                if (image.is_primary && typeof image.is_primary !== 'boolean') {
                    throw new Error('is_primary must be a boolean');
                }
            }
            return true;
        })

];