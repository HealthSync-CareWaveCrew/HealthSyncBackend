import { GoogleGenAI } from '@google/genai';
import Analysis from '../models/Analysis.model.js';
import User from '../models/User.model.js';
import Disease from '../models/Disease.model.js';
import mongoose from 'mongoose';
import ErrorClass from '../util/errorClass.js';
import { uploadImageBufferToCloudinary } from './cloudinary.service.js';

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in .env file.");
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Service: Analyze medical image using Gemini AI
 */
export const analyzeImageService = async (diseaseId, file, diseaseType, user) => {
    try {
        const uploadedImage = await uploadImageBufferToCloudinary(file);

        const base64Image = file.buffer.toString("base64");
        const mimeType = file.mimetype;

        const modelId = "gemini-flash-latest";

        const prompt = `
        User claims this is a ${diseaseType} image.
        
        Task 1: Verification
        Verify if this image is indeed a valid medical image (e.g., MRI, CT Scan, X-Ray, Fundus) consistent with a ${diseaseType} diagnosis context.
        - If the image is NOT a medical image or does NOT match the anatomy/modality for ${diseaseType}, set "match" to false.

        Task 2: Analysis (Only if Verification passed)
        If "match" is true:
        - Analyze the image for signs of ${diseaseType}.
        - Provide a confidence score (accuracy) for the prediction.
        - Provide a descriptive analysis.

        Output strictly in JSON format:
        {
            "match": boolean,
            "reason": "Reason for mismatch (only if match is false)",
            "disease": "Predicted condition/type (e.g., 'Meningioma', 'Diabetic Retinopathy', 'Normal')",
            "confidence": "e.g., 95%",
            "description": "Detailed description of findings..."
        }
    `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType,
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
            config: {
                responseMimeType: "application/json",
            },
        });

        if (!response || !response.text) {
            throw new ErrorClass("AI model returned empty response.", 502);
        }

        let jsonResponse;

        try {
            jsonResponse = JSON.parse(response.text);
        } catch (parseError) {
            throw new ErrorClass("Invalid AI JSON response format.", 500);
        }

        // Save to database
        try {
            const analysis = new Analysis({
                type: "image",
                disease: diseaseId,
                diseaseType,
                results: jsonResponse,
                user: user._id,
                inputImageUrl: uploadedImage.secure_url,
                inputImagePublicId: uploadedImage.public_id,
            });

            await analysis.save();
        } catch (dbError) {
            console.error("Database save failed:", dbError);
            // Optional: don't crash entire request
        }

        return jsonResponse;

    } catch (error) {
        console.error("Error in analyzeImageService:", error);

        if (error instanceof ErrorClass) {
            throw error;
        }

        throw new ErrorClass("Image analysis failed.", 500);
    }
};

/**
 * Service: Analyze clinical data using Gemini AI
 */

export const analyzeClinicalDataService = async (diseaseId, diseaseType, formData,user) => {
    try {
        const modelId = "gemini-flash-latest";

        const dataString = Object.entries(formData)
            .map(([key, value]) => `- ${key}: ${value}`)
            .join("\n");

        const prompt = `
        Task: Clinical Data Analysis for ${diseaseType}
        
        Patient Data:
        ${dataString}

        Based on the provided clinical indicators, analyze the likelihood of ${diseaseType}.
        
        1. Analyze the values against standard medical thresholds.
        2. Predict if the patient likely has the disease or not.
        3. Provide a confidence score/probability.
        4. Explain the reasoning, highlighting key risk factors from the data.

        Output strictly in JSON format:
        {
            "match": true, 
            "disease": "${diseaseType} Prediction",
            "confidence": "e.g., High (85%)",
            "description": "Detailed analysis..."
        }
    `;

        const result = await ai.models.generateContent({
            model: modelId,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" },
        });

        if (!result || !result.text) {
            throw new ErrorClass("AI model returned empty response.", 502);
        }

        let jsonResponse;

        try {
            jsonResponse = JSON.parse(result.text);
        } catch (parseError) {
            throw new ErrorClass("Invalid AI JSON response format.", 500);
        }

        // Save analysis (non-critical)
        try {
            const analysis = new Analysis({
                type: "clinical",
                user: user._id,
                disease: diseaseId,
                diseaseType,
                results: jsonResponse,
                formData,
            });

            await analysis.save();
        } catch (dbError) {
            console.error("Database save failed:", dbError);
            // Don't crash the request
        }

        return jsonResponse;

    } catch (error) {
        console.error("Error in analyzeClinicalDataService:", error);

        if (error instanceof ErrorClass) {
            throw error;
        }

        throw new ErrorClass("Clinical data analysis failed.", 500);
    }
};

/**
 * Service: Send chat message using Gemini AI
 */
export const sendChatMessageService = async (
    message,
    history,
    systemInstruction
) => {
    try {
        const modelId = "gemini-flash-latest";

        const config = {};
        if (systemInstruction) {
            config.systemInstruction = systemInstruction;
        }

        const chat = ai.chats.create({
            model: modelId,
            history: history || [],
            config,
        });

        const result = await chat.sendMessage({
            message,
        });

        if (!result || !result.text) {
            throw new ErrorClass("AI returned empty response.", 502);
        }

        return { text: result.text };

    } catch (error) {
        console.error("Error in sendChatMessageService:", error);

        if (error instanceof ErrorClass) {
            throw error;
        }

        throw new ErrorClass("Chat service failed.", 500);
    }
};

/**
 * Service: Get analysis history from database
 */
export const getAnalysisHistoryService = async (requestUser, filters = {}) => {
    try {
        const query = {
            // isDeleted: false,
        };

        if (requestUser?.role !== 'admin') {
            query.user = requestUser?._id;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.date) {
            const start = new Date(filters.date);
            const end = new Date(filters.date);

            if (!Number.isNaN(start.getTime())) {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                query.createdAt = { $gte: start, $lte: end };
            }
        }

        if (filters.diseaseName) {
            const matchingDiseases = await Disease.find({
                name: { $regex: filters.diseaseName, $options: 'i' },
            }).select('_id');

            query.$or = [
                { diseaseType: { $regex: filters.diseaseName, $options: 'i' } },
                { disease: { $in: matchingDiseases.map((d) => d._id) } },
            ];
        }

        if (requestUser?.role === 'admin' && filters.user) {
            if (mongoose.Types.ObjectId.isValid(filters.user)) {
                query.user = filters.user;
            } else {
                const matchingUsers = await User.find({
                    $or: [
                        { name: { $regex: filters.user, $options: 'i' } },
                        { email: { $regex: filters.user, $options: 'i' } },
                    ],
                }).select('_id');

                query.user = { $in: matchingUsers.map((u) => u._id) };
            }
        }

        const analyses = await Analysis.find(query)
            .populate('disease')
            .populate('user', 'name email role')
            .sort({ createdAt: -1 })
            .limit(200);

        return analyses;

    } catch (error) {
        console.error("Database error in getAnalysisHistoryService:", error);

        throw new ErrorClass("Failed to fetch analysis history.", 500);
    }
};

/**
 * Service: Get analysis by ID from database
 */
export const getAnalysisByIdService = async (id, requestUser) => {
    try {
        const analysis = await Analysis.findOne({
            _id: id,
            isDeleted: false,
        })
            .populate('disease')
            .populate('user', 'name email role');

        if (!analysis) {
            return null;
        }

        if (requestUser?.role !== 'admin' && analysis.user?._id?.toString() !== requestUser?._id?.toString()) {
            throw new ErrorClass('You are not allowed to access this analysis.', 403);
        }

        return analysis;
    } catch (error) {
        if (error instanceof ErrorClass) {
            throw error;
        }
        console.error("Database error in getAnalysisByIdService:", error);
        throw new ErrorClass("Failed to fetch analysis.", 500);
    }
};

/**
 * Service: Soft delete analysis by ID
 */
export const softDeleteAnalysisService = async (id) => {
    try {
        const analysis = await Analysis.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        );

        return analysis;
    } catch (error) {
        console.error('Database error in softDeleteAnalysisService:', error);
        throw new ErrorClass('Failed to delete analysis.', 500);
    }
};
