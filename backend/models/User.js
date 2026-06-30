import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    preferredLanguage: {
      type: String,
      default: 'en-US',
    },
    preferredCity: {
      type: String,
      trim: true,
    },
    preferredDistrict: {
      type: String,
      trim: true,
    },
    preferredState: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    lastKnownLocation: {
      type: String,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    village: {
      type: String,
      trim: true,
    },
    farmSize: {
      type: Number,
    },
    farmSizeUnit: {
      type: String,
      enum: ['Acres', 'Hectares', 'Guntas', 'Bighas'],
      default: 'Acres',
    },
    soilType: {
      type: String,
      trim: true,
    },
    waterSource: {
      type: String,
      trim: true,
    },
    irrigationMethod: {
      type: String,
      trim: true,
    },
    primaryCrop: {
      type: String,
      trim: true,
    },
    secondaryCrop: {
      type: String,
      trim: true,
    },
    cropStage: {
      type: String,
      trim: true,
    },
    plantingDate: {
      type: Date,
    },
    expectedHarvestDate: {
      type: Date,
    },
    livestock: {
      type: String,
      trim: true,
    },
    experienceYears: {
      type: Number,
    },
    farmingType: {
      type: String,
      trim: true,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
