import mongoose from 'mongoose';

const farmSchema = new mongoose.Schema(
  {
    farmName: {
      type: String,
      required: [true, 'Please add a farm name'],
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    soilType: {
      type: String,
      trim: true,
    },
    crop: {
      type: String,
      trim: true,
    },
    cropStage: {
      type: String,
      trim: true,
    },
    area: {
      type: Number,
    },
    areaUnit: {
      type: String,
      enum: ['Acres', 'Hectares', 'Guntas', 'Bighas'],
      default: 'Acres',
    },
    waterSource: {
      type: String,
      trim: true,
    },
    plantingDate: {
      type: Date,
    },
    expectedHarvestDate: {
      type: Date,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Farm = mongoose.model('Farm', farmSchema);
export default Farm;
