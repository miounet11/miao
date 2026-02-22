import { Router } from 'express';
import authRoutes from './auth';
import configRoutes from './config';
import userRoutes from './user';
import healthRoutes from './health';
import storageRoutes from './storage';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/user', userRoutes);
router.use('/health', healthRoutes);
router.use('/storage', storageRoutes);

export default router;
