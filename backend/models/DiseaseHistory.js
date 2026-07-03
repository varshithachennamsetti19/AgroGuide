import mongoose from 'mongoose';

const diseaseHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
    },
    imagePath: {
      type: String,
      required: true,
    },
    crop: {
      type: String,
      required: true,
    },
    disease: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
    severity: {
      type: String,
      required: true,
    },
    treatment: {
      organic: { type: String, default: '' },
      chemical: { type: String, default: '' },
      preventive: { type: String, default: '' },
      precautions: { type: String, default: '' }
    },
    weather: {
      type: mongoose.Schema.Types.Mixed,
    },
    location: {
      type: String,
      default: '',
    }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false }
  }
);

const DiseaseHistory = mongoose.model('DiseaseHistory', diseaseHistorySchema);
export default DiseaseHistory;
