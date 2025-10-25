import mongoose from 'mongoose';

const testCaseSchema = mongoose.Schema({
    input: { type: String, required: true },
    output: { type: String, required: true }
});

const starterCodeSchema = mongoose.Schema({
    language: { type: String, required: true, enum: ['javascript', 'python', 'java'] },
    code: { type: String, required: true }
}, { _id: false });

const problemSchema = mongoose.Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    testCases: [testCaseSchema],
    starterCode: [starterCodeSchema]
}, { timestamps: true });

const Problem = mongoose.model('Problem', problemSchema);
export default Problem;