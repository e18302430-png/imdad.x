
import { GoogleGenAI, Type } from "@google/genai";
import type { Delegate } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const performDeepPreparationScan = async (facePhoto: string, carPhoto: string, delegateName: string): Promise<string> => {
    const prompt = `
    أنت نظام رؤية حاسوبية ذكي متخصص في الرقابة اللوجستية لشركة إمداد-X.
    مهمتك هي تحليل صورتين لعملية تحضير المندوب: ${delegateName}.
    الصورة الأولى: سيلفي المندوب. الصورة الثانية: مقدمة السيارة.
    المطلوب تحليل:
    1. المندوب: الوضوح، الزي الرسمي، الحالة العامة.
    2. السيارة: اللون، الماركة، حالة الهيكل (صدمات/أوساخ).
    3. التفاصيل: وضوح اللوحة والمصابيح.
    4. التوصية: اعتماد التحضير أم لا ونسبة الالتزام المتوقعة.
    اكتب التقرير بنقاط مهنية بالعربية.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { 
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: facePhoto.split(',')[1] || facePhoto } },
                    { inlineData: { mimeType: 'image/jpeg', data: carPhoto.split(',')[1] || carPhoto } }
                ] 
            },
        });
        return response.text || "فشل توليد التقرير.";
    } catch (error) {
        return "فشل الاتصال بخدمات التحليل الذكي.";
    }
};

export interface PerformanceAnalysisPayload {
    totalOrders: number;
    avgDailyOrders: string;
    overallAttendance: string;
    topPerformer: string;
    totalViolations: number;
    avgCommitment: string;
    delegates: { 
        name: string; 
        totalOrders: number; 
        attendanceRate: number; 
        violationsCount: number;
        commitmentScore: number;
    }[];
}

export const generatePerformanceAnalysis = async (payload: PerformanceAnalysisPayload): Promise<string> => {
    const prompt = `
    بصفتك مستشاراً استراتيجياً لوجستياً، حلل أداء الفريق بناءً على:
    - إجمالي الطلبات: ${payload.totalOrders}
    - معدل الالتزام العام: ${payload.avgCommitment}%
    - إجمالي المخالفات المرصودة: ${payload.totalViolations}
    - الحضور العام: ${payload.overallAttendance}
    
    البيانات التفصيلية: ${JSON.stringify(payload.delegates)}
    
    المطلوب:
    1. تقييم كفاءة التشغيل الميداني.
    2. رصد علاقة المخالفات والغياب بحجم الإنتاجية.
    3. تحديد المناديب "المخاطرة" (كثير المخالفات/قليل الالتزام).
    4. توصيات عملية للمشرفين لرفع الكفاءة.
    اللغة: احترافية، عربية، حازمة.
    `;
    try {
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt 
        });
        return response.text || "فشل التحليل الاستراتيجي.";
    } catch (error) { return "خطأ في الاتصال بالذكاء الاصطناعي."; }
};

export const extractDriverDataFromFile = async (base64Data: string, mimeType: string): Promise<any[]> => {
    const prompt = `استخرج بيانات المناديب كـ JSON فقط: الاسم، المعرف، الهوية، الجوال، اللوحة.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }, { inlineData: { data: base64Data.split(',')[1] || base64Data, mimeType: mimeType } }] }],
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { throw new Error("AI Extraction Error"); }
};

export const generateMessage = async (topic: string): Promise<string> => {
    const prompt = `أنشئ رسالة رسمية لمندوب توصيل حول: "${topic}".`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "فشل إنشاء الرسالة.";
    } catch (error) { return "حدث خطأ."; }
};
