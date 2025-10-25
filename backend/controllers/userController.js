import Submission from '../models/submissionModel.js';
import Contest from '../models/contestModel.js';
import User from '../models/userModel.js';

// @desc    Get user profile data and stats
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Get basic user info
        const user = await User.findById(userId).select('name createdAt');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Get aggregate stats from Submissions
        const submissionStats = await Submission.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: null,
                    totalSubmissions: { $sum: 1 },
                    accepted: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Accepted"] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // 3. Get submission breakdown by language
        const languageStats = await Submission.aggregate([
            { $match: { userId: userId } },
            { $group: { _id: '$language', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // 4. Get submission breakdown by status
        const statusStats = await Submission.aggregate([
            { $match: { userId: userId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // 5. Get contests participated in and calculate wins
        const participatedContests = await Contest.find({ 
            'participants.userId': userId,
            endTime: { $lt: new Date() } // Only count finished contests
        }).lean();

        let contestsWon = 0;
        participatedContests.forEach(contest => {
            if (contest.leaderboard && contest.leaderboard.length > 0) {
                // Sort leaderboard by score (desc) and time (asc)
                const sortedLeaderboard = [...contest.leaderboard].sort((a, b) => {
                    if (a.score !== b.score) return b.score - a.score;
                    const timeA = a.lastSuccessfulSubmissionTime ? new Date(a.lastSuccessfulSubmissionTime).getTime() : Infinity;
                    const timeB = b.lastSuccessfulSubmissionTime ? new Date(b.lastSuccessfulSubmissionTime).getTime() : Infinity;
                    return timeA - timeB;
                });

                // Check if the user is the winner
                if (sortedLeaderboard[0].userId.equals(userId)) {
                    contestsWon++;
                }
            }
        });

        // 6. Get recent activity (last 10 submissions)
        const recentActivity = await Submission.find({ userId: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate({
                path: 'contestId',
                select: 'questions.title questions._id'
            });

        const processedActivity = recentActivity.map(activity => {
            const contest = activity.contestId;
            let problemTitle = 'Unknown Problem';
            if (contest && contest.questions) {
                const problem = contest.questions.id(activity.problemId);
                if (problem) problemTitle = problem.title;
            }
            return {
                _id: activity._id,
                status: activity.status,
                language: activity.language,
                createdAt: activity.createdAt,
                problemTitle,
            };
        });

        res.json({
            user: {
                name: user.name,
                joined: user.createdAt,
            },
            stats: {
                totalContests: participatedContests.length,
                contestsWon,
                totalSubmissions: submissionStats[0]?.totalSubmissions || 0,
                acceptedSubmissions: submissionStats[0]?.accepted || 0,
            },
            charts: {
                language: languageStats,
                status: statusStats,
            },
            recentActivity: processedActivity
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};