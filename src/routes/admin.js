import express from 'express';
const router = express.Router();

import userRoutes from './user.js';

router.use('/users', userRoutes);

export default router;