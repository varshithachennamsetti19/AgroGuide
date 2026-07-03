import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    type: {
      type: String,
      enum: ['weather', 'market', 'scheme', 'crop', 'general'],
      default: 'general',
    },
    isRead: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false }
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
