import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Profile = sequelize.define('Profile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    first_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    last_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            is: /^\+?[\d\s\-\(\)]{10,}$/
        }
    },
    avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other', 'prefer-not-to-say'),
        allowNull: true
    }
}, {
    tableName: 'profiles',
    timestamps: true,
    underscored: true,
});

// Instance methods
Profile.prototype.getFullName = function () {
    return `${this.first_name} ${this.last_name}`;
};

export default Profile;