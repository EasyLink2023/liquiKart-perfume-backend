import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Department = sequelize.define('Department', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },

},
    {
        tableName: 'departments',
        timestamps: true,
        underscored: true,
    }
);

export default Department;