import Subscriber from '../models/Subscriber.model.js';
import { sendSubscriptionEmail } from '../service/email.service.js';

export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(400).json({ status: 'fail', message: 'Email already subscribed' });
    }

    await Subscriber.create({ email });
    await sendSubscriptionEmail(email);

    res.status(201).json({ status: 'success', message: 'Subscribed successfully!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};