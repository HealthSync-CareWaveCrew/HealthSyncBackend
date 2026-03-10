import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'clinical'],
    required: true,
  },
   user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  disease: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Disease",
    required: true,
  },
  diseaseType: {
    type: String,
    required: true,
  },
  results: {
    match: Boolean,
    disease: String,
    confidence: String,
    description: String,
    reason: String,
  },
  formData: mongoose.Schema.Types.Mixed,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis;
