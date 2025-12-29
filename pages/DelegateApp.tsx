
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Delegate, RequestType, OperationalStatus, Request, DelegateRequestTopic, RequestStatus, UserRole } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { firestoreService } from '../services/firestoreService';
import { generateRequestNumber } from '../services/dataService';
import LoadingSpinner from '../components/LoadingSpinner';

const DelegateApp: React.FC = () => {
    const { data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginPhone, setLoginPhone] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [currentUser, setCurrentUser] = useState<Delegate | null>(null);
    const [error, setError] = useState('');
    const [showChangePass, setShowChangePass] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [passError, setPassError] = useState('');
    const [activeTab, setActiveTab] = useState<'home' | 'requests' | 'circulars' | 'prep'>('home');
    const [prepStep, setPrepStep] = useState(1);
    const [facePhoto, setFacePhoto] = useState<string | null>(null);
    const [carPhoto, setCarPhoto] = useState<string | null>(null);
    const [isSavingPrep, setIsSavingPrep] = useState(false);
    const [newReqTopic, setNewReqTopic] = useState<DelegateRequestTopic>(DelegateRequestTopic.Leave);
    const [newReqDesc, setNewReqDesc] = useState('');
    const [isSubmittingReq, setIsSubmittingReq] = useState(false);
    const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

    const peakInfo = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 12 && hour < 16) return { active: true, type: 'lunch', label: "ذروة الغداء 🍗", color: "from-orange-500 to-amber-600", msg: "أعلى كثافة طلبات حالياً!", warning: "⚠️ لا تغلق التطبيق في الذروة." };
        if (hour >= 19 || hour < 3) return { active: true, type: 'night', label: "ذروة المساء 🔥", color: "from-red-600 to-indigo-900", msg: "وقت حصاد الطلبات يا بطل!", warning: "⚠️ الخروج الآن يحرمك من البونص." };
        return { active: false, type: 'none', label: "وضع الاستعداد ☕", color: "from-slate-700 to-slate-900", msg: "استعد للذروة القادمة.", warning: "" };
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault(); setError('');
        const found = data.delegates.find(d => d.phone === loginPhone && (d.password === loginPass || d.displayId?.slice(-4) === loginPass));
        if (found) { 
            if (found.requiresPasswordChange) { setCurrentUser(found); setShowChangePass(true); } 
            else { setCurrentUser(found); setIsLoggedIn(true); } 
        } else { setError('عذراً، رقم الجوال أو كلمة المرور غير صحيحة.'); }
    };

    const handleUpdatePass = async (e: React.FormEvent) => {
        e.preventDefault(); setPassError('');
        if (newPass !== confirmPass) { setPassError('كلمات المرور غير متطابقة.'); return; }
        if (newPass.length < 4) { setPassError('يجب أن تكون 4 أرقام على الأقل.'); return; }
        if (currentUser) {
            const updated = { ...currentUser, password: newPass, requiresPasswordChange: false };
            await firestoreService.saveItem('delegates', updated);
            setData(prev => ({ ...prev, delegates: prev.delegates.map(d => d.id === currentUser.id ? updated : d) }));
            setCurrentUser(updated); setShowChangePass(false); setIsLoggedIn(true);
        }
    };

    const handlePrepSubmit = async () => {
        if (!currentUser || !facePhoto || !carPhoto) return;
        setIsSavingPrep(true); const now = new Date().toISOString();
        const updated: Delegate = { ...currentUser, lastShiftStartTime: now, lastShiftFacePhoto: facePhoto, lastShiftCarPhoto: carPhoto, manualStatus: OperationalStatus.Active };
        await firestoreService.saveItem('delegates', updated);
        setData(prev => ({ ...prev, delegates: prev.delegates.map(d => d.id === currentUser.id ? updated : d) }));
        setCurrentUser(updated); setPrepStep(1); setActiveTab('home'); setIsSavingPrep(false);
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault(); if (!newReqDesc.trim() || !currentUser) return;
        setIsSubmittingReq(true);
        const workflow: UserRole[] = [UserRole.OpsSupervisor, UserRole.MovementManager, UserRole.HR, UserRole.GeneralManager];
        const now = new Date().toISOString();
        const newReq: Request = { id: Date.now(), requestNumber: generateRequestNumber(RequestType.Employee, data.requests), title: t(`request_topic_${newReqTopic}`), description: newReqDesc, type: RequestType.Employee, status: RequestStatus.PendingApproval, fromDelegateId: currentUser.id, createdAt: now, lastActionTimestamp: now, history: [{ actor: 'Delegate' as any, actorName: currentUser.name, action: 'Created', timestamp: now }], workflow, currentStageIndex: 0, topic: newReqTopic };
        await firestoreService.saveItem('requests', newReq);
        setData(prev => ({ ...prev, requests: [...prev.requests, newReq] }));
        setNewReqDesc(''); setIsSubmittingReq(false); alert("تم إرسال طلبك بنجاح للأقسام المعنية.");
    };

    if (showChangePass) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Cairo'] text-white" dir="rtl">
            <div className="glass-card w-full max-w-sm p-8 border-orange-500/50 shadow-2xl rounded-[2.5rem]">
                <h2 className="text-2xl font-black mb-2 text-orange-500 text-center">أمان الحساب</h2>
                <p className="text-slate-400 text-xs mb-8 text-center font-bold">يجب تعيين كلمة مرور جديدة قوية للمتابعة</p>
                <form onSubmit={handleUpdatePass} className="space-y-4">
                    <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="كلمة المرور الجديدة" className="input-styled w-full py-5 text-center text-xl font-black rounded-2xl" required />
                    <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="تأكيد كلمة المرور" className="input-styled w-full py-5 text-center text-xl font-black rounded-2xl" required />
                    {passError && <p className="text-red-400 text-xs font-bold text-center">{passError}</p>}
                    <button type="submit" className="w-full py-5 bg-orange-600 rounded-2xl font-black hover:bg-orange-500 shadow-xl transition-all active:scale-95">حفظ وتدشين الدخول</button>
                </form>
            </div>
        </div>
    );

    if (!isLoggedIn || !currentUser) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Cairo']" dir="rtl">
            <div className="w-full max-w-sm space-y-10 text-center">
                <div className="w-24 h-24 bg-orange-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-orange-600/40 transform rotate-6 border-4 border-white/10"><i className="fas fa-truck-fast text-white text-4xl"></i></div>
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter">إمداد-X</h1>
                    <p className="text-orange-500 text-xs mt-3 font-black uppercase tracking-[0.3em]">Field Operations Hub</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-3">
                        <div className="relative group">
                            <i className="fas fa-phone absolute top-1/2 -translate-y-1/2 right-5 text-slate-600 group-focus-within:text-orange-500 transition-colors"></i>
                            <input type="tel" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="رقم الجوال المسجل" className="input-styled w-full pr-12 py-5 bg-slate-900 border-slate-800 text-center text-lg font-bold rounded-[1.5rem]" required />
                        </div>
                        <div className="relative group">
                            <i className="fas fa-lock absolute top-1/2 -translate-y-1/2 right-5 text-slate-600 group-focus-within:text-orange-500 transition-colors"></i>
                            <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="كلمة المرور" className="input-styled w-full pr-12 py-5 bg-slate-900 border-slate-800 text-center text-lg font-bold rounded-[1.5rem]" required />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-xs font-bold animate-shake bg-red-500/10 py-3 rounded-xl">{error}</p>}
                    <button type="submit" className="w-full py-5 bg-orange-600 text-white font-black text-xl rounded-[1.5rem] shadow-2xl hover:bg-orange-500 active:scale-90 transition-all border-b-4 border-orange-800">دخول الميدان</button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="min-h-[100dvh] bg-[#020617] text-white flex flex-col font-['Cairo'] overflow-hidden" dir="rtl">
            {/* Header Mobile Optimized */}
            <header className="px-6 py-5 bg-slate-900/90 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-[100] flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <img src={currentUser.imageUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=1'} className="w-11 h-11 rounded-2xl border-2 border-orange-500/50 shadow-lg object-cover group-active:scale-110 transition-transform" alt="" />
                        {currentUser.lastShiftStartTime && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#020617] animate-pulse shadow-sm shadow-green-500"></div>}
                    </div>
                    <div>
                        <h2 className="font-black text-xs text-white truncate max-w-[130px]">{currentUser.name}</h2>
                        <span className="text-[9px] text-orange-500 font-bold uppercase tracking-widest">{currentUser.displayId}</span>
                    </div>
                </div>
                <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="w-10 h-10 bg-red-600/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-600/20 active:scale-75 transition-all border border-red-500/20">
                    <i className="fas fa-power-off"></i>
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar space-y-5">
                {/* Visual Banner */}
                <div className={`bg-gradient-to-br ${peakInfo.color} p-5 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden active:scale-95 transition-transform duration-500`}>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className={`w-14 h-14 bg-white/20 rounded-[1.2rem] flex items-center justify-center text-white text-2xl ${peakInfo.active ? 'animate-bounce' : ''}`}><i className={`fas ${peakInfo.type === 'lunch' ? 'fa-hamburger' : peakInfo.type === 'night' ? 'fa-bolt' : 'fa-mug-hot'}`}></i></div>
                        <div className="flex-1"><h4 className="font-black text-white text-lg leading-tight">{peakInfo.label}</h4><p className="text-[11px] text-white/90 font-bold mt-1 uppercase tracking-tighter">{peakInfo.msg}</p></div>
                    </div>
                    <i className={`fas ${peakInfo.type === 'lunch' ? 'fa-hamburger' : peakInfo.type === 'night' ? 'fa-bolt' : 'fa-mug-hot'} absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12`}></i>
                </div>

                {activeTab === 'home' && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="glass-card p-8 text-center border-slate-800 bg-slate-900/40 relative overflow-hidden rounded-[2.5rem] shadow-2xl">
                            {!currentUser.lastShiftStartTime ? (
                                <div className="space-y-6">
                                    <div className="w-24 h-24 bg-slate-800 rounded-[2rem] mx-auto flex items-center justify-center border-2 border-slate-700 shadow-inner group active:bg-orange-500/10 transition-colors"><i className="fas fa-moon text-4xl text-slate-600 group-active:text-orange-500"></i></div>
                                    <div className="space-y-1"><p className="text-xl font-black">أنت "أوفلاين"</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">يجب التحضير لاستقبال الطلبات</p></div>
                                    <button onClick={() => setActiveTab('prep')} className="w-full py-5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-black text-lg shadow-2xl shadow-orange-600/30 active:scale-95 transition-all border-b-4 border-orange-800">ابدأ الدوام الآن <i className="fas fa-bolt mr-2"></i></button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="w-24 h-24 bg-green-500/10 rounded-[2rem] mx-auto flex items-center justify-center border-2 border-green-500/30 animate-pulse shadow-lg shadow-green-500/10"><i className="fas fa-signal text-4xl text-green-500"></i></div>
                                    <div className="space-y-1"><p className="text-xl font-black text-green-400">متصل بالميدان</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">نظام الطلبات يعمل بأقصى طاقة</p></div>
                                    <button onClick={() => { if(peakInfo.active && !window.confirm(peakInfo.warning)) return; const u = { ...currentUser, lastShiftStartTime: undefined, manualStatus: OperationalStatus.Idle }; firestoreService.saveItem('delegates', u); setCurrentUser(u); setData(p=>({...p, delegates: p.delegates.map(d=>d.id===u.id?u:d)})); }} className="w-full py-5 bg-red-600/10 border border-red-500/30 text-red-500 rounded-2xl font-black text-lg active:scale-95 transition-all">إنهاء الدوام والراحة <i className="fas fa-power-off mr-2"></i></button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-card p-5 bg-slate-900/60 rounded-[1.8rem] border-slate-800 flex flex-col items-center gap-3 text-center">
                                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center"><i className="fas fa-chart-line text-lg"></i></div>
                                <div className="space-y-1"><p className="text-white font-black text-lg">0</p><p className="text-[9px] text-slate-500 font-bold uppercase">طلبات اليوم</p></div>
                            </div>
                            <div className="glass-card p-5 bg-slate-900/60 rounded-[1.8rem] border-slate-800 flex flex-col items-center gap-3 text-center">
                                <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center"><i className="fas fa-trophy text-lg"></i></div>
                                <div className="space-y-1"><p className="text-white font-black text-lg">0</p><p className="text-[9px] text-slate-500 font-bold uppercase">تقييمك الحالي</p></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-xl font-black text-white flex items-center gap-3 px-1"><i className="fas fa-file-signature text-orange-500"></i> طلباتي الرسمية</h3>
                        <form onSubmit={handleSubmitRequest} className="glass-card p-5 bg-slate-900/60 space-y-4 border-slate-800 rounded-[2rem] shadow-2xl">
                            <div className="grid grid-cols-2 gap-2">
                                {[DelegateRequestTopic.Leave, DelegateRequestTopic.Financial, DelegateRequestTopic.Clearance, DelegateRequestTopic.Other].map(topic => (
                                    <button key={topic} type="button" onClick={() => setNewReqTopic(topic)} className={`py-4 rounded-xl text-[10px] font-black border-2 transition-all ${newReqTopic === topic ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{t(`request_topic_${topic}`)}</button>
                                ))}
                            </div>
                            <textarea value={newReqDesc} onChange={e => setNewReqDesc(e.target.value)} placeholder="اشرح طلبك بوضوح..." className="input-styled w-full bg-slate-900/50 border-slate-800 text-sm h-32 focus:border-orange-500 rounded-2xl" required />
                            <button disabled={isSubmittingReq} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-lg">{isSubmittingReq ? <LoadingSpinner /> : <><i className="fas fa-paper-plane"></i> إرسال الطلب</>}</button>
                        </form>
                    </div>
                )}

                {activeTab === 'circulars' && (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-xl font-black text-white flex items-center gap-3 px-1"><i className="fas fa-bullhorn text-indigo-500"></i> التعاميم الميدانية</h3>
                        {(data.circulars || []).length === 0 ? (
                            <div className="p-10 text-center text-slate-600"><i className="fas fa-ghost text-4xl mb-4 opacity-10 block"></i> لا توجد تعاميم حالياً</div>
                        ) : (
                            data.circulars.filter(c => c.audience === 'all' || c.audience === 'delegates').map(c => (
                                <div key={c.id} className="glass-card p-6 border-slate-800 bg-slate-900/40 relative overflow-hidden rounded-[2rem] shadow-xl">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                                    <h5 className="font-black text-indigo-400 mb-2">{c.title}</h5>
                                    <p className="text-xs text-slate-300 leading-relaxed font-bold">{c.content}</p>
                                    <div className="mt-5 pt-3 border-t border-white/5 flex justify-between items-center text-[8px] text-slate-500 font-black uppercase tracking-widest"><span>بواسطة: {c.authorName}</span><span className="font-mono">{new Date(c.createdAt).toLocaleDateString()}</span></div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'prep' && (
                    <div className="space-y-8 animate-fade-in text-center pb-20">
                        <h3 className="text-xl font-black tracking-tight flex items-center justify-center gap-3"><i className="fas fa-shield-alt text-orange-500"></i> رادار التحضير</h3>
                        <div className="max-w-xs mx-auto space-y-8">
                            {prepStep === 1 ? (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="relative mx-auto w-56 h-56 group">
                                        {facePhoto ? <img src={facePhoto} className="w-full h-full rounded-[3.5rem] object-cover border-4 border-orange-500 shadow-2xl" alt="" /> : <div className="w-full h-full rounded-[3.5rem] bg-slate-900 border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-800 text-6xl shadow-inner"><i className="fas fa-user-circle"></i></div>}
                                        <label className="absolute -bottom-4 right-1/2 translate-x-1/2 w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center border-4 border-[#020617] cursor-pointer shadow-2xl active:scale-90 transition-all"><i className="fas fa-camera text-white"></i><input type="file" accept="image/*" capture="user" onChange={e=>{const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onloadend=()=>setFacePhoto(r.result as string); r.readAsDataURL(f);}}} className="hidden" /></label>
                                    </div>
                                    <div className="space-y-1"><h4 className="font-black text-lg">الصورة الشخصية</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">يرجى ارتداء الزي الرسمي والابتسام</p></div>
                                    <button disabled={!facePhoto} onClick={()=>setPrepStep(2)} className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${facePhoto?'bg-orange-600 text-white shadow-xl shadow-orange-900/20':'bg-slate-800 text-slate-600 opacity-50'}`}>الخطوة التالية <i className="fas fa-chevron-left mr-2"></i></button>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-slide-up">
                                    <div className="relative mx-auto w-56 h-56 group">
                                        {carPhoto ? <img src={carPhoto} className="w-full h-full rounded-[3.5rem] object-cover border-4 border-orange-500 shadow-2xl" alt="" /> : <div className="w-full h-full rounded-[3.5rem] bg-slate-900 border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-800 text-6xl shadow-inner"><i className="fas fa-car"></i></div>}
                                        <label className="absolute -bottom-4 right-1/2 translate-x-1/2 w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center border-4 border-[#020617] cursor-pointer shadow-2xl active:scale-90 transition-all"><i className="fas fa-camera text-white"></i><input type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onloadend=()=>setCarPhoto(r.result as string); r.readAsDataURL(f);}}} className="hidden" /></label>
                                    </div>
                                    <div className="space-y-1"><h4 className="font-black text-lg">صورة السيارة</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">تأكد من وضوح لوحة المركبة</p></div>
                                    <div className="flex gap-3"><button onClick={()=>setPrepStep(1)} className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black active:scale-95 transition-all">رجوع</button><button disabled={!carPhoto||isSavingPrep} onClick={handlePrepSubmit} className={`flex-[2] py-5 rounded-2xl font-black text-lg shadow-xl transition-all ${carPhoto?'bg-green-600 text-white':'bg-slate-800 text-slate-600 opacity-50'}`}>{isSavingPrep?<LoadingSpinner/>:'إكمال التحضير'}</button></div>
                                </div>
                            )}
                            <button onClick={()=>setActiveTab('home')} className="text-slate-600 text-[10px] font-black py-4 block mx-auto uppercase tracking-widest underline decoration-dashed">إلغاء وإغلاق</button>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-6 left-5 right-5 bg-slate-900/90 backdrop-blur-2xl border border-white/5 h-18 rounded-[2rem] shadow-2xl z-[150] flex items-center justify-around px-2 border-b-4 border-orange-500/20">
                {[ { id: 'home', icon: 'fa-home', label: 'الرئيسية' }, { id: 'requests', icon: 'fa-file-invoice', label: 'طلباتي' }, { id: 'circulars', icon: 'fa-bullhorn', label: 'التعاميم' } ].map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300 ${activeTab === item.id ? 'text-orange-500 -translate-y-2' : 'text-slate-500'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg' : 'bg-transparent'}`}><i className={`fas ${item.icon} text-lg`}></i></div><span className={`text-[8px] font-black transition-all ${activeTab === item.id ? 'opacity-100 scale-100' : 'opacity-0 scale-50 h-0 overflow-hidden'}`}>{item.label}</span></button>
                ))}
            </nav>
        </div>
    );
};

export default DelegateApp;
