import { Router } from 'express';
import { getMe, createUserController } from '../controllers/user.controller';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.get('/me', auth, getMe);
router.post('/createUser', auth, requireRole('ADMIN'), createUserController);

export default router;
