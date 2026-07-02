import mongoose from 'mongoose';

const queryLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Allow anonymous/pre-auth if needed, though usually populated
    },
    query: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['allowed', 'blocked'],
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      default: 100,
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false } // Only track creation timestamp
  }
);

const QueryLog = mongoose.model('QueryLog', queryLogSchema);
export default QueryLog;
