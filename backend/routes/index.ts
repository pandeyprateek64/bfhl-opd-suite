import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import quoteRoutes from './quote.routes';
import statsRoutes from './stats.routes';
import activityRoutes from './activity.routes';
import allocationRoutes from './allocation.routes';

const router = Router();

router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', quoteRoutes);
router.use('/', statsRoutes);
router.use('/', activityRoutes);
router.use('/', allocationRoutes);

export default router;
