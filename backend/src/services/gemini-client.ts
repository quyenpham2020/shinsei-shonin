// backend/src/services/gemini-client.ts

import { GoogleGenAI } from "@google/genai";

// Khởi tạo Gemini Client. 
// SDK sẽ tự động tìm GEMINI_API_KEY trong biến môi trường.
export const geminiClient = new GoogleGenAI({});

// Tên mô hình đề xuất
export const GEMINI_MODEL = 'gemini-2.5-flash';