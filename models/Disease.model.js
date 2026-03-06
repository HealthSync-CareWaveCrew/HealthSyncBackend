import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'radio', 'checkbox'],
    required: true,
  },
  options: [String], // For select, radio, checkbox fields
  placeholder: String,
  required: {
    type: Boolean,
    default: true,
  },
  validation: {
    min: Number,
    max: Number,
    pattern: String,
  },
});

const diseaseSchema = new mongoose.Schema({
  diseaseId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  predictionType: {
    type: String,
    enum: ['image', 'text'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  fields: {
    type: [fieldSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
diseaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Disease = mongoose.model('Disease', diseaseSchema);

export default Disease;
