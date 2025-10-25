import mongoose from 'mongoose';

const submissionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Contest',
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    language: {
      type: String,
      required: true,
      enum: ['javascript', 'python', 'java'],
    },
    code: {
      type: String,
      required: true,
    },
    linesOfCode: {
        type: Number,
        required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Accepted', 'Partial', 'Wrong Answer', 'Error', 'Time Limit Exceeded', 'Memory Limit Exceeded'],
    },
  },
  {
    timestamps: true,
  }
);

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;