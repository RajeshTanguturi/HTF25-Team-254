// import express from 'express';
// import { 
//     createContest, 
//     joinContest, 
//     getContestQuestions, 
//     getLeaderboard,
//     getContestLobbyDetails,
//     startContest
// } from '../controllers/contestController.js';
// const router = express.Router();

// router.post('/create', createContest);
// router.post('/join', joinContest);
// router.get('/:id/lobby', getContestLobbyDetails);
// router.post('/:id/start', startContest);
// router.get('/:id/questions', getContestQuestions);
// router.get('/:id/leaderboard', getLeaderboard);

// export default router;

import express from 'express';
import {
    createContest,
    joinContest,
    getContestLobbyDetails,
    startContest,
    getContestQuestions,
    getLeaderboard,
    getPlatformStats,
    getPublicContests,
    cloneContest
} from '../controllers/contestController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// New routes for library and stats
router.get('/stats', protect, getPlatformStats);
router.get('/library', protect, getPublicContests);
router.post('/clone/:id', protect, cloneContest);

// Existing routes
router.post('/create', protect, createContest);
router.post('/join', protect, joinContest);
router.get('/:id/lobby', protect, getContestLobbyDetails);
router.post('/:id/start', protect, startContest);
router.get('/:id/questions', protect, getContestQuestions);
router.get('/:id/leaderboard', protect, getLeaderboard);

export default router;