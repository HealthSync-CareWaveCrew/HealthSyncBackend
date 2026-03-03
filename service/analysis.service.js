import { GoogleGenAI } from '@google/genai';
import Analysis from '../models/Analysis.model.js';
import ErrorClass from '../util/errorClass.js';

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in .env file.");
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Service: Analyze medical image using Gemini AI
 */
export const analyzeImageService = async (file, diseaseType) => {
    try {
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
                diseaseType,
                results: jsonResponse,
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

export const analyzeClinicalDataService = async (diseaseType, formData) => {
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
 * Service: Get analysis history from database
 */
export const getAnalysisHistoryService = async () => {
  try {
    const analyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(50);

    return analyses;

  } catch (error) {
    console.error("Database error in getAnalysisHistoryService:", error);

    throw new ErrorClass("Failed to fetch analysis history.", 500);
  }
};

/**
 * Service: Get analysis by ID from database
 */
export const getAnalysisByIdService = async (id) => {
  try {
    const analysis = await Analysis.findById(id);
    return analysis;
  } catch (error) {
    console.error("Database error in getAnalysisByIdService:", error);
    throw new ErrorClass("Failed to fetch analysis.", 500);
  }
};
