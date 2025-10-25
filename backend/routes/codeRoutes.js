// import express from 'express';
// import { runCode, submitCode } from '../controllers/codeController.js';
// const router = express.Router();

// router.post('/run', runCode);
// router.post('/submit', submitCode);

// export default router;

import express from 'express';
import { runCode, submitCode } from '../controllers/codeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/run', protect, runCode);
router.post('/submit', protect, submitCode);

export default router;