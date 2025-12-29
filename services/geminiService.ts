import { GoogleGenAI } from "@google/genai";

// Declare process to satisfy TypeScript if types are missing
declare var process: {
  env: {
    API_KEY: string;
  };
};

// دالة مساعدة للحصول على نسخة الذكاء الاصطناعي بشكل آمن
// هذا يمنع توقف التطبيق عن العمل إذا كان المفتاح مفقوداً عند بدء التشغيل
const getAI = () => {
    // According to guidelines, use