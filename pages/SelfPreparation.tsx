
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserRole, Delegate } from '../types';
import { getOperationalDate } from '../services/dataService';
import { firestoreService } from '../services/firestoreService';
import { performDeepPreparationScan } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';

const SelfPreparation: React.FC = () => {
    const { data, currentUser, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [scanningId, setScanningId] = useState<number | null>(null);
    const [scanResults, setScanResults] = useState<Record<number, string>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const freshData = await firestoreService.loadAppData();
            if (freshData) setData(freshData);
        } catch (e) { console.error(e); }
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleAIScan = async (delegate: Delegate) => {
        if (!delegate.lastShiftFacePhoto || !delegate.lastShiftCarPhoto) return;
        setScanningId(delegate.id);
        try {
            const result = await performDeepPreparationScan(
                delegate.lastShiftFacePhoto,
                delegate.lastShiftCarPhoto,
                delegate.name
            );
            setScanResults(prev => ({ ...prev, [delegate.id]: result }));
        } catch (e) {
            setScanResults(prev => ({ ...prev, [delegate.id]: "عذراً، الرادار يواجه ضغطاً تقنياً حالياً." }));
        } finally {
            setScanningId(null);
        }
    };

    const preparedDelegates = useMemo(() => {
        const operationalToday = getOperationalDate();
        return data.delegates.filter(d => {
            if (d.employmentStatus !== 'نشط' || d.isDeleted) return false;
            if (currentUser?.role === UserRole.OpsSupervisor && d.supervisorId !== currentUser.id) return false;
            if (!d.lastShiftStartTime) return false;
            return getOperationalDate(d.lastShiftStartTime) === operationalToday;
        });
    }, [data.delegates, currentUser]);

    const filteredDelegates = useMemo(() => {
        if (!searchQuery) return preparedDelegates;
        const q = searchQuery.toLowerCase();
        return preparedDelegates.filter(d => d.name.toLowerCase().includes(q) || d.displayId?.includes(q));
    }, [preparedDelegates, searchQuery]);

    return (
        <div className="space-y-8 animate-fade-in pb-20" dir="rtl">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4">
                        <i className="fas fa-radar text-orange-500 animate-pulse"></i> 
                        رادار التحضير والذكاء الاصطناعي
                    </h1>
                    <p className="text-slate-500 font-bold mt-1 mr-1 tracking-tight">نظام التحقق المتطور للمناديب والمركبات بأحدث تقنيات Vision AI</p>
                </div>
                <div className="flex gap-4 w-full lg:w-auto">
                    <div className="relative flex-grow lg:w-80">
                        <i className="fas fa-search absolute top-1/2 -translate-y-1/2 right-5 text-slate-500"></i>
                        <input 
                            type="text" 
                            placeholder="بحث باسم بطل الميدان..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className="input-styled w-full pr-12 py-4 rounded-[1.5rem] bg-slate-900 border-slate-800 text-sm font-bold shadow-2xl" 
                        />
                    </div>
                    <button onClick={handleRefresh} className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-orange-500 border border-white/5 hover:bg-slate-700 transition-all shadow-xl">
                        <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {filteredDelegates.length === 0 ? (
                <div className="glass-card p-32 text-center border-dashed border-slate-800 bg-slate-900/20">
                    <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-user-shield text-5xl text-slate-700"></i>
                    </div>
                    <p className="text-xl font-black text-slate-600">لا توجد عمليات تحضير نشطة حالياً تحت المراقبة</p>
                    <button onClick={handleRefresh} className="mt-6 text-orange-500 font-bold hover:underline">تحديث البيانات</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-10">
                    {filteredDelegates.map(delegate => (
                        <div key={delegate.id} className="glass-card overflow-hidden bg-slate-900/60 border-slate-800 flex flex-col lg:flex-row transition-all hover:border-orange-500/30 group shadow-2xl">
                            {/* Left Side: Delegate Info & Visuals */}
                            <div className="lg:w-[40%] p-8 border-l border-white/5 space-y-8 bg-slate-900/40">
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <img src={delegate.imageUrl} className="w-20 h-20 rounded-[2rem] border-2 border-orange-500 object-cover shadow-xl" alt="" />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#020617] animate-pulse"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white">{delegate.name}</h3>
                                        <div className="flex gap-3 items-center mt-1">
                                            <span className="text-[10px] bg-orange-600/20 text-orange-400 font-black px-3 py-1 rounded-lg border border-orange-500/20 uppercase tracking-widest">ID: {delegate.displayId}</span>
                                            <span className="text-[10px] text-slate-500 font-bold bg-white/5 px-2 py-1 rounded-lg">
                                                <i className="fas fa-clock ml-1"></i>
                                                {new Date(delegate.lastShiftStartTime!).toLocaleTimeString('ar-SA')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">التحقق من الهوية</p>
                                        <div className="aspect-[4/5] rounded-[2rem] overflow-hidden border-2 border-slate-800 relative group-hover:border-orange-500/20 shadow-inner bg-black">
                                            <img src={delegate.lastShiftFacePhoto} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" alt="Face" />
                                            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_15px_orange] animate-scan-line"></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">فحص المركبة الشامل</p>
                                        <div className="aspect-[4/5] rounded-[2rem] overflow-hidden border-2 border-slate-800 relative group-hover:border-orange-500/20 shadow-inner bg-black">
                                            <img src={delegate.lastShiftCarPhoto} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" alt="Car" />
                                            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_15px_cyan] animate-scan-line"></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleAIScan(delegate)}
                                    disabled={scanningId === delegate.id}
                                    className="w-full py-5 bg-gradient-to-r from-orange-600 to-orange-500 disabled:from-slate-800 disabled:to-slate-900 text-white rounded-2xl font-black text-base shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 group/btn"
                                >
                                    {scanningId === delegate.id ? (
                                        <><LoadingSpinner /> جاري تحليل البيانات الحيوية والتقنية...</>
                                    ) : (
                                        <>
                                            <i className="fas fa-brain text-xl group-hover/btn:animate-bounce"></i>
                                            تشغيل الفحص الذكي (Vision AI)
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Right Side: AI Insights */}
                            <div className="flex-1 p-10 bg-black/30 flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    <i className="fas fa-robot text-[150px]"></i>
                                </div>
                                
                                <div className="flex items-center gap-4 mb-8 relative z-10">
                                    <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-lg">
                                        <i className="fas fa-microchip text-xl"></i>
                                    </div>
                                    <h4 className="text-xl font-black text-white tracking-tight uppercase">تقرير الذكاء الاصطناعي للفحص التقني</h4>
                                </div>

                                {scanResults[delegate.id] ? (
                                    <div className="flex-grow space-y-6 animate-fade-in relative z-10">
                                        <div className="bg-slate-900/80 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-md">
                                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-line font-bold text-base">
                                                {scanResults[delegate.id]}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                                                <span className="text-[10px] text-green-400 font-black uppercase tracking-widest">Live Scan Verified</span>
                                            </div>
                                            <button 
                                                onClick={() => setScanResults(prev => {
                                                    const next = {...prev};
                                                    delete next[delegate.id];
                                                    return next;
                                                })}
                                                className="text-slate-500 text-xs font-bold hover:text-white transition-colors"
                                            >
                                                إعادة الفحص <i className="fas fa-redo-alt mr-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                ) : scanningId === delegate.id ? (
                                    <div className="flex-grow flex flex-col items-center justify-center text-slate-500 gap-6 relative z-10">
                                        <div className="relative">
                                            <div className="w-24 h-24 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin"></div>
                                            <i className="fas fa-shield-alt absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-orange-500 animate-pulse"></i>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-white text-lg animate-pulse mb-2">جاري استخراج بيانات المركبة والمندوب</p>
                                            <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase">Deep Neural Vision Scan in progress...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-grow flex flex-col items-center justify-center text-slate-700 gap-6 opacity-40 relative z-10">
                                        <div className="w-32 h-32 border-2 border-dashed border-slate-800 rounded-full flex items-center justify-center">
                                            <i className="fas fa-satellite-dish text-6xl"></i>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-lg">الرادار بانتظار أمر البدء للفحص التقني</p>
                                            <p className="text-xs font-bold mt-2">اضغط على زر التشغيل لبدء تحليل صور التحضير</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes scan-line {
                    0% { top: 0%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 4s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default SelfPreparation;
