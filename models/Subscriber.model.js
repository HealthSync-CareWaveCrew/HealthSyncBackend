import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Subscriber = mongoose.model('Subscriber', subscriberSchema);
export default Subscriber;