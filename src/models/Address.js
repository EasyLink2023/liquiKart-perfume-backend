import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Address = sequelize.define('Address', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.ENUM('billing', 'shipping', 'office', 'other'),
        defaultValue: 'shipping',
        validate: {
            isIn: [['billing', 'shipping', 'office', 'other']]
        }
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 255]
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        validate: {
            is: /^[\+]?[1-9][\d]{0,15}$/
        }
    },
    line1: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [5, 255]
        }
    },
    line2: {
        type: DataTypes.STRING(255),
        validate: {
            len: [0, 255]
        }
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    postal_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [3, 20]
        }
    },
    country: {
        type: DataTypes.STRING(100),
        defaultValue: 'India',
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'addresses',
    timestamps: true,
    underscored: true,
});

export default Address;