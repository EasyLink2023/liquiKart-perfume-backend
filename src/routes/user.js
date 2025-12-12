import express from 'express';
const router = express.Router();

import { createUserValidation, updateUserValidation } from '../validators/user.js';
import { createUser, deleteUser, getUserById, getUsers, toggleUserStatus, updateUser } from "../controllers/user.js";

// User routes
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUserValidation, createUser);
router.put('/:id', updateUserValidation, updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/status', toggleUserStatus);

export default router;