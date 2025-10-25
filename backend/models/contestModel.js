// import mongoose from 'mongoose';

// // Schema for starter code, embedded within a problem
// const starterCodeSchema = mongoose.Schema({
//     language: { type: String, required: true, enum: ['javascript', 'python', 'java'] },
//     code: { type: String, required: true }
// }, { _id: false });

// // Schema for test cases, embedded within a problem
// const testCaseSchema = mongoose.Schema({
//     input: { type: String, required: true },
//     output: { type: String, required: true }
// });

// // Schema for a single problem, embedded within a contest
// const problemSchema = mongoose.Schema({
//     title: { type: String, required: true },
//     description: { type: String, required: true },
//     starterCode: [starterCodeSchema],
//     testCases: [testCaseSchema]
// });

// // Schema for participant scores in the leaderboard
// const participantScoreSchema = mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     userName: { type: String, required: true },
//     // Total score is the sum of scores from all problems
//     score: { type: Number, default: 0 }, 
//     // NEW: Array to store the score for each problem individually
//     problemScores: [{
//         problemId: { type: mongoose.Schema.Types.ObjectId, required: true },
//         score: { type: Number, default: 0 }
//     }],
// }, { _id: false });

// // Main Contest Schema
// const contestSchema = mongoose.Schema({
//     roomId: { type: String, required: true, unique: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     duration: { type: Number, required: true },
//     status: {
//         type: String,
//         required: true,
//         enum: ['waiting', 'inprogress', 'finished'],
//         default: 'waiting',
//     },
//     startTime: { type: Date },
//     endTime: { type: Date },
//     questions: [problemSchema], // Problems are embedded
//     participants: [{ 
//         userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//         userName: { type: String }
//      }],
//     leaderboard: [participantScoreSchema]
// }, { timestamps: true });

// const Contest = mongoose.model('Contest', contestSchema);
// export default Contest;

import mongoose from 'mongoose';

const starterCodeSchema = mongoose.Schema({
    language: { type: String, required: true, enum: ['javascript', 'python', 'java'] },
    code: { type: String, required: true }
}, { _id: false });

const testCaseSchema = mongoose.Schema({
    input: { type: String, required: true },
    output: { type: String, required: true }
});

const problemSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    starterCode: [starterCodeSchema],
    testCases: [testCaseSchema]
});

const participantScoreSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    score: { type: Number, default: 0 },
    problemScores: [{
        problemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        score: { type: Number, default: 0 }
    }],
    lastSuccessfulSubmissionTime: { type: Date },
}, { _id: false });

const contestSchema = mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    duration: { type: Number, required: true },
    status: {
        type: String,
        required: true,
        enum: ['waiting', 'inprogress', 'finished'],
        default: 'waiting',
    },
    startTime: { type: Date },
    endTime: { type: Date },
    questions: [problemSchema],
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: { type: String }
     }],
    leaderboard: [participantScoreSchema]
}, { 
    timestamps: true,
    optimisticConcurrency: true,
});

const Contest = mongoose.model('Contest', contestSchema);
export default Contest;