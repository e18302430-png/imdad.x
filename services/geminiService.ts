import { GoogleGenAI } from "@google/genai";

// تعريف process.env لمنع أخطاء TypeScript إذا لم تكن الانواع موجودة
declare var process: {
  env: {
    API_KEY: string;
  };
};

// دالة مساعدة للحصول على نسخة الذكاء الاصطناعي بشكل آمن
const getAI = () => {
    // يجب استخدام process.env.API_KEY حصراً حسب التوجيهات
    // Vite سيقوم باستبدال هذا المتغير بالقيمة النصية أثناء البناء
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        console.warn("تنبيه: مفتاح Gemini API غير موجود. لن تعمل ميزات الذكاء الاصطناعي.");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const generateMessage = async (topic: string): Promise<string> => {
    const ai = getAI();
    if (!ai) return "عذراً، خدمة الرسائل الذكية غير مفعلة (مفتاح API مفقود).";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `أنت مساعد إداري ذكي في شركة "إمداد-X" للخدمات اللوجستية. 
            اكتب رسالة واتساب قصيرة، احترافية، ومشجعة (باللغة العربية) موجهة لمندوب توصيل.
            الموضوع: "${topic}".
            اجعل النبرة حماسية وودودة وتدعو للعمل.`,
        });
        return response.text || "لم يتم إنشاء رسالة.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "حدث خطأ أثناء إنشاء الرسالة. يرجى المحاولة لاحقاً.";
    }
};

export const performDeepPreparationScan = async (
    facePhoto: string, 
    carPhoto: string, 
    name: string
): Promise<string> => {
    const ai = getAI();
    if (!ai) return "عذراً، خدمة الرادار الذكي غير مفعلة (مفتاح API مفقود).";

    try {
        // تنظيف سلاسل base64 من الترويسة إذا كانت موجودة
        const cleanFace = facePhoto.replace(/^data:image\/\w+;base64,/, "");
        const cleanCar = carPhoto.replace(/^data:image\/\w+;base64,/, "");

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', // نموذج يدعم المدخلات المتعددة (صور + نصوص)
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanFace } },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanCar } },
                    { text: `قم بتحليل صور التحضير اليومي للمندوب "${name}".
                    - الصورة الأولى: سيلفي المندوب (تحقق من الابتسامة، المظهر العام، ارتداء الزي إن وجد).
                    - الصورة الثانية: سيارة المندوب (تحقق من النظافة، وضوح اللوحة).
                    
                    المطلوب:
                    اكتب تقرير فحص "رادار" قصير جداً ومرح باللهجة السعودية أو لغة بيضاء محفزة.
                    ابدأ بعبارة "نتائج فحص الرادار 📡:"
                    قيم الالتزام بنسبة مئوية في النهاية (مثلاً: نسبة الجاهزية: 95%).` }
                ]
            }
        });
        return response.text || "لم يتمكن الرادار من استخراج النتائج.";
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return "حدث خطأ أثناء تحليل الصور. تأكد من جودة الصور واتصال الإنترنت.";
    }
};