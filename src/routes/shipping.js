import express from 'express';
import {
    getRates,
} from '../controllers/fedEx.js';

const router = express.Router();

// Routes
router.post('/rates', getRates);


export default router;