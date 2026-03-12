import { Router } from 'express';
import { saveQuote, getQuotes, getQuoteById, patchQuote } from '../controllers/quote.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/saveQuote', auth, saveQuote);
router.get('/quotes', auth, getQuotes);
router.get('/quotes/:id', auth, getQuoteById);
router.patch('/quotes/:id', auth, patchQuote);

export default router;
