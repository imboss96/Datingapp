// transactions.js
// ES module export for transaction routes

import { Router } from 'express';
const router = Router();

// Example route
router.get('/', (req, res) => {
  res.json({ message: 'Transactions endpoint working.' });
});

export default router;
