import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ProductImage = sequelize.define('ProductImage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING(255), allowNull: false },
    is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },

},
    {
        tableName: 'product_images',
        timestamps: true,
        underscored: true,
    }
);

export default ProductImage;