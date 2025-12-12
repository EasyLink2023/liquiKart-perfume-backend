import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../config/database.js";

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [6, 255]
        }
    },
    role: {
        type: DataTypes.ENUM('CUSTOMER', 'VENDOR', 'ADMIN'),
        defaultValue: 'CUSTOMER',
        allowNull: false
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    verification_token: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    reset_password_token: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    reset_password_expires: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 12);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 12);
            }
        }
    }
});

// Instance methods
User.prototype.verifyPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

User.prototype.updatePassword = async function (newPassword) {
    this.password = newPassword;
    return await this.save();
};

User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.verification_token;
    delete values.reset_password_token;
    delete values.reset_password_expires;
    return values;
};

export default User;