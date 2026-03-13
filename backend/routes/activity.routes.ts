import { Router } from 'express';
import { getActivity } from '../controllers/activity.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/activity', auth, getActivity);

export default router;
