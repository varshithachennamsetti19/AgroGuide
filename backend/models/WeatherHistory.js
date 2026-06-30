import mongoose from 'mongoose';

const weatherHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    temperature: {
      type: Number,
      required: true,
    },
    condition: {
      type: String,
      required: true,
    },
    weatherCondition: {
      type: String,
    },
    humidity: {
      type: Number,
    },
    windSpeed: {
      type: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const WeatherHistory = mongoose.model('WeatherHistory', weatherHistorySchema);
export default WeatherHistory;
