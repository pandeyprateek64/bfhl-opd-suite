import { Router } from 'express';
import { saveAllocation, getAllocations, webhookAllocation } from '../controllers/allocation.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/saveAllocation', auth, saveAllocation);
router.get('/allocations', auth, getAllocations);
router.post('/webhook/allocation', webhookAllocation);

export default router;
