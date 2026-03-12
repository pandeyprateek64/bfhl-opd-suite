import { Router } from 'express';
import { login, seed } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/seed', seed);

export default router;
