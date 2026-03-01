import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.routes.js';
import connectDB from './config/dbConnection.js';
import { globalErrorHandling } from './util/errorHandling.js';


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Connection
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mediscan-ai';
// mongoose.connect(MONGODB_URI)
//   .then(() => console.log('✅ Connected to MongoDB'))
//   .catch((err) => console.error('❌ MongoDB connection error:', err));
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/', apiRoutes);

// Global error handler MUST be last
app.use(globalErrorHandling);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
