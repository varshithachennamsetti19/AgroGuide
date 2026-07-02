import mongoose from 'mongoose';

const predictionHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    predictionType: {
      type: String,
      required: true,
    },
    prediction: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    }
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false }
  }
);

const PredictionHistory = mongoose.model('PredictionHistory', predictionHistorySchema);
export default PredictionHistory;
