import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    item_lookup_code: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    size: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        }
    },
    vendor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    sale_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    online_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
        defaultValue: 'active'
    }
}, {
    tableName: 'products',
    timestamps: true,
    underscored: true
});

export default Product;