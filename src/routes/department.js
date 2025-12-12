import express from "express";
const router = express.Router();

// Import controllers
import {
    getDepartments,
    getDepartmentById,
    createDepartment,
    bulkCreateDepartments,
    updateDepartment,
    deleteDepartment
} from '../controllers/vendor/department.js';

// Import validations
import {
    getDepartmentsValidation,
    departmentIdValidation,
    createDepartmentValidation,
    bulkCreateValidation,
    updateDepartmentValidation
} from '../validators/department.js';

import authenticate from '../middlewares/auth.js';

router.get('/', getDepartmentsValidation, getDepartments);
router.get('/:id', departmentIdValidation, getDepartmentById);

router.post('/', authenticate, createDepartmentValidation, createDepartment);
router.post('/bulk', authenticate, bulkCreateValidation, bulkCreateDepartments);
router.put('/:id', authenticate, updateDepartmentValidation, updateDepartment);
router.delete('/:id', authenticate, departmentIdValidation, deleteDepartment);

export default router;