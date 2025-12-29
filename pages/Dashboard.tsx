
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import LoadingSpinner from '../components/LoadingSpinner';
import { Delegate, OperationalStatus, PerformanceStatus } from '../types';

interface DelegateAnalysis {
    id: number;
    displayId: string;
    phone: string;
    name: string;
    imageUrl: string;
    orders: number;
    commitmentScore: number;
    weekendGaps: string[];
    efficiencyTier: 'Elite' | 'Stable' | 'NeedsImprovement' | 'Critical';
    score: number;
}

const Dashboard: React.FC = () => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();
    const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);
    const [analysisResults, setAnalysisResults] = useState<DelegateAnalysis[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const runTacticalAnalysis = () => {
        setIsProcessing(true);
        setIsAnalysisVisible(true);
        
        setTimeout(() => {
            const activeDelegates = data.delegates.filter(d => d.employmentStatus === 'نشط' && !d.isDeleted);
            
            const results: DelegateAnalysis[] = activeDelegates.map(d => {
                const activity = d.activity || [];
                const presentCount = activity.filter(a => a.status === 'Present').length;
                const commitment = Math.round((presentCount / 3) * 100);
                const orders = d.ordersDelivered || 0;
                const hasViolations = d.violations && d.violations !== "لا يوجد";
                
                const weekendGaps: string[] = [];
                if (d.weekendAbsence?.thursday) weekendGaps.push("الخميس");
                if (d.weekendAbsence?.friday) weekendGaps.push("الجمعة");
                if (d.weekendAbsence?.saturday) weekendGaps.push("السبت");

                const weekendPenalty = weekendGaps.length * 15;
                const productivityPoints = Math.min((orders / 15) * 40, 40);
                const commitmentPoints = (commitment / 100) * 40;
                const violationPenalty = hasViolations ? 20 : 0;
                
                const finalScore = Math.max(0, Math.min(100, productivityPoints + commitmentPoints + 20 - violationPenalty - weekendPenalty));

                let tier: DelegateAnalysis['efficiencyTier'] = 'Stable';
                if (finalScore >= 88 && orders >= 12 && weekendGaps.length === 0) tier = 'Elite';
                else if (finalScore < 50 || commitment < 40 || weekendGaps.length >= 2) tier = 'Critical';
                else if (finalScore < 75) tier = 'NeedsImprovement';

                return {
                    id: d.id,
                    displayId: d.displayId || '---',
                    phone: d.phone,
                    name: d.name,
                    imageUrl: d.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.id}`,
                    orders,
                    commitmentScore: commitment,
                    weekendGaps,
                    efficiencyTier: tier,
                    score: Math.round(finalScore)
                };
            });

            setAnalysisResults(results.sort((a, b) => b.score - a.score));
            setIsProcessing(false);
        }, 1500);
    };

    const getTierDetails = (tier: DelegateAnalysis['efficiencyTier']) => {
        const configs = {
            Elite: { label: 'بطل الميدان 🏆', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'fa-crown' },
            Stable: { label: 'أداء مستقر ✅', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'fa-user-check' },
            NeedsImprovement: { label: 'تنبيه تطوير ⚠️', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'fa-chart-line' },
            Critical: { label: 'مخاطرة تشغيلية 🔥', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'fa-exclamation-triangle' }
        };
        return configs[tier];
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-32 pt-6" dir="rtl">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-4 px-6 py-2 bg-slate-900 rounded-full border border-orange-500/20 shadow-2xl">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                    <span className="text-[11px] text-orange-400 font-black uppercase tracking-[0.3em]">Operational Analytics Engine</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter leading-none select-none">رادار الـكـفـاءة</h1>
                <p className="text-slate-500 font-bold text-xl max-w-3xl mx-auto leading-relaxed">تشريح تكتيكي فوري لإنتاجية المناديب والالتزام بأيام الذروة (أجير وكفالة).</p>
            </div>

            <div className="text-center pt-4">
                <button onClick={runTacticalAnalysis} className="group relative px-24 py-8 bg-orange-600 hover:bg-orange-500 text-white font-black text-3xl rounded-[3rem] shadow-[0_30px_60px_rgba(234,88,12,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-6 mx-auto border-b-[10px] border-orange-800">
                    <i className="fas fa-radar text-yellow-300"></i> تشغيل الفحص الاستراتيجي
                </button>
            </div>

            {isAnalysisVisible && (
                <div className="space-y-12 animate-fade-in">
                    <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/10 pb-8 gap-4">
                        <h2 className="text-4xl font-black text-white flex items-center gap-5 italic"><i className="fas fa-microchip text-orange-500"></i> نتائج التحليل الميداني</h2>
                        <button onClick={() => setIsAnalysisVisible(false)} className="px-6 py-2 bg-red-600/10 text-red-500 rounded-xl font-black text-xs hover:bg-red-600 hover:text-white transition-all">إغلاق التقرير</button>
                    </div>

                    {isProcessing ? (
                        <div className="py-40 text-center glass-card bg-slate-900/60 border-orange-500/20"><LoadingSpinner /><p className="text-orange-500 font-black text-2xl animate-pulse mt-6">جاري معالجة مصفوفة الالتزام والإنتاجية...</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {analysisResults.map((res) => {
                                const cfg = getTierDetails(res.efficiencyTier);
                                return (
                                    <div key={res.id} className={`glass-card p-0 overflow-hidden border-2 transition-all hover:translate-y-[-8px] ${cfg.border} bg-slate-900/80 shadow-2xl`}>
                                        <div className={`p-5 ${cfg.bg} flex justify-between items-center border-b ${cfg.border}`}>
                                            <span className={`text-[11px] font-black uppercase px-4 py-1.5 rounded-full bg-black/50 border border-white/5 flex items-center gap-2 ${cfg.color}`}><i className={`fas ${cfg.icon}`}></i> {cfg.label}</span>
                                            <p className="text-3xl font-black text-white">{res.score}%</p>
                                        </div>
                                        <div className="p-8 space-y-8">
                                            <div className="flex items-center gap-5">
                                                <div className="relative w-20 h-20"><img src={res.imageUrl} className="w-20 h-20 rounded-[1.5rem] object-cover border-2 border-orange-500/30 shadow-2xl" alt="" /><div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#020617]"></div></div>
                                                <div className="flex-1 min-w-0"><h3 className="text-xl font-black text-white truncate mb-1">{res.name}</h3><span className="text-[12px] font-black text-orange-500 font-mono bg-orange-500/10 px-2.5 py-0.5 rounded-lg border border-orange-500/10">ID: {res.displayId}</span></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-black/40 p-4 rounded-[1.5rem] border border-white/5"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">طلبات اليوم</p><p className="text-2xl font-black text-white">{res.orders}</p></div>
                                                <div className="bg-black/40 p-4 rounded-[1.5rem] border border-white/5"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">أيام الغياب (ويكند)</p><p className={`text-[11px] font-black ${res.weekendGaps.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{res.weekendGaps.length > 0 ? res.weekendGaps.join('، ') : 'ملتزم كلياً'}</p></div>
                                            </div>
                                            <div className="pt-6 border-t border-white/5 space-y-3">
                                                <div className="flex items-center gap-3 text-indigo-400 text-[11px] font-black uppercase tracking-wider"><div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center"><i className="fas fa-lightbulb"></i></div>توصية الرادار</div>
                                                <div className="bg-slate-800/20 p-4 rounded-2xl"><p className="text-[12px] text-slate-300 font-bold leading-relaxed">{res.efficiencyTier === 'Elite' ? 'مندوب مثالي يستحق الحوافز الكاملة.' : res.efficiencyTier === 'Critical' ? 'تراجع حاد في الالتزام يتطلب تدخل المشرف.' : 'أداء مستقر يحتاج مراقبة في أوقات الذروة.'}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
