import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    query: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      required: true,
    },
    sources: [
      {
        sourceName: { type: String, required: true },
        url: { type: String, required: true },
        publishedDate: { type: Date },
        retrievedTime: { type: Date, default: Date.now },
        confidenceScore: { type: Number, default: 100 }
      }
    ],
    confidence: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      required: true,
      default: 'High'
    }
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false }
  }
);

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
export default SearchHistory;
