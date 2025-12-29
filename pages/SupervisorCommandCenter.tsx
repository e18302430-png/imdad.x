
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Delegate, OperationalStatus } from '../types';
import { getHours, getOperationalDate } from '../services/dataService';
import { firestoreService } from '../services/firestoreService';

const SupervisorCommandCenter: React.FC = () => {
    const { data, currentUser, setData } = useContext(AppContext);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeControlId, setActiveControlId] = useState<number | null>(null);
    const tacticalHours = getHours();
    const operationalToday = getOperationalDate();

    const fleetStatus = useMemo(() => {
        return data.delegates.filter(d => d.employmentStatus === 'نشط' && !d.isDeleted).map(d => {
            const isPrepared = d.lastShiftStartTime && getOperationalDate(d.lastShiftStartTime) === operationalToday;
            return { ...d, isPrepared };
        });
    }, [data.delegates, operationalToday]);

    const filteredDelegates = useMemo(() => {
        let list = fleetStatus;
        if (currentUser?.role === 'OpsSupervisor') list = list.filter(d => d.supervisorId === currentUser.id);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(d => d.name.toLowerCase().includes(q) || d.displayId?.includes(q));
        }
        return list;
    }, [fleetStatus, searchQuery, currentUser]);

    const activeDelegate = useMemo(() => fleetStatus.find(d => d.id === activeControlId), [fleetStatus, activeControlId]);

    const handleUpdateStatusAndNotify = async (status: OperationalStatus) => {
        if (!activeDelegate) return;
        
        // 1. تحديث الحالة في قاعدة البيانات
        const updated = { ...activeDelegate, manualStatus: status };
        setData(prev => ({ ...prev, delegates: prev.delegates.map(d => d.id === activeDelegate.id ? updated : d) }));
        await firestoreService.saveItem('delegates', updated);

        // 2. تجهيز رسالة الواتساب
        let message = "";
        if (status === OperationalStatus.Elite) {
            message = `تحية فخر واعتزاز يا بطل! 🌟\nالمندوب: ${activeDelegate.name}\nلقد تم رصد أدائك المتميز اليوم في نظام إمداد-X. استمر في هذا العطاء وأنت فخر لفريقنا!`;
        } else if (status === OperationalStatus.Warning) {
            message = `تنبيه أداء ميداني ⚠️\nالمندوب: ${activeDelegate.name}\nيرجى مراجعة وتيرة العمل وزيادة عدد الطلبات فوراً لتجنب المساءلة التشغيلية. نحن نثق بقدرتك على التحسن.`;
        }

        // 3. التحويل للواتساب فوراً
        if (activeDelegate.phone && message) {
            const phone = activeDelegate.phone.startsWith('0') ? '966' + activeDelegate.phone.substring(1) : activeDelegate.phone;
            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24" dir="rtl">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4">
                        <i className="fas fa-satellite-dish text-indigo-500 animate-pulse"></i> 
                        مركز القيادة الميداني
                    </h1>
                    <p className="text-slate-500 text-sm font-bold mt-1">الرصد الفوري والتحكم المباشر لأسطول إمداد-X</p>
                </div>
                <div className="relative w-full lg:w-96">
                    <i className="fas fa-search absolute top-1/2 -translate-y-1/2 right-5 text-slate-500"></i>
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم أو المعرف..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="input-styled w-full pr-12 py-4 text-sm rounded-[1.5rem] bg-slate-900 border-slate-800" 
                    />
                </div>
            </div>

            {activeDelegate && (
                <div className="glass-card border-indigo-500/40 bg-slate-900/95 backdrop-blur-2xl shadow-2xl animate-slide-up sticky top-24 z-[1000] overflow-hidden rounded-[2.5rem]">
                    <div className="bg-indigo-600/10 p-6 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-5">
                            <img src={activeDelegate.imageUrl} className="w-16 h-16 rounded-[1.5rem] border-2 border-indigo-500 object-cover" alt="" />
                            <div>
                                <h3 className="font-black text-white text-xl">{activeDelegate.name}</h3>
                                <span className="text-xs text-indigo-400 font-mono tracking-widest">{activeDelegate.displayId}</span>
                            </div>
                        </div>
                        <button onClick={() => setActiveControlId(null)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i className="fas fa-bolt text-yellow-500"></i> إجراءات تكتيكية سريعة (واتساب)
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleUpdateStatusAndNotify(OperationalStatus.Elite)} 
                                    className="py-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-[10px] font-black transition-all shadow-lg flex flex-col items-center gap-2"
                                >
                                    <i className="fas fa-star text-lg"></i>
                                    <span>بطل الميدان 🌟</span>
                                </button>
                                <button 
                                    onClick={() => handleUpdateStatusAndNotify(OperationalStatus.Warning)} 
                                    className="py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black transition-all shadow-lg flex flex-col items-center gap-2"
                                >
                                    <i className="fas fa-exclamation-triangle text-lg"></i>
                                    <span>تنبيه أداء ⚠️</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i className="fas fa-history text-indigo-400"></i> سجل حضور الساعات الثلاث
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {tacticalHours.map(h => {
                                    const s = activeDelegate.activity?.find(a => a.hour === h)?.status;
                                    return (
                                        <div key={h} className={`p-3 rounded-xl border-2 text-center flex flex-col items-center transition-all ${
                                            s === 'Present' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 
                                            s === 'Absent' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 
                                            'border-slate-800 text-slate-700 bg-slate-900/50'
                                        }`}>
                                            <span className="text-[8px] font-black mb-1 opacity-50">{h.split(' - ')[0]}</span>
                                            <i className={`fas ${s === 'Present' ? 'fa-check-circle' : s === 'Absent' ? 'fa-times-circle' : 'fa-minus-circle'} text-lg`}></i>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <i className="fas fa-chart-bar text-orange-400"></i> إحصائيات سريعة
                            </h4>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-slate-500 font-bold">إجمالي طلبات اليوم</p>
                                <p className="text-3xl font-black text-orange-500">{activeDelegate.ordersDelivered || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 relative z-10">
                {filteredDelegates.map(d => (
                    <div 
                        key={d.id} 
                        onClick={() => setActiveControlId(d.id)} 
                        className={`glass-card p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:scale-95 border-2 group relative ${
                            activeControlId === d.id ? 'border-indigo-500 bg-indigo-500/5' : 
                            d.isPrepared ? 'border-green-500/20' : 'border-red-500/20'
                        }`}
                    >
                        <div className="relative mb-4">
                            <img src={d.imageUrl} className={`w-16 h-16 rounded-2xl object-cover border-2 ${d.isPrepared ? 'border-green-500' : 'border-slate-700 opacity-60'}`} />
                            {d.isPrepared && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#020617] animate-pulse"></div>}
                        </div>
                        <p className="text-[11px] font-black text-white truncate w-full mb-1">{d.name}</p>
                        <p className="text-[9px] text-orange-500 font-mono font-bold">{d.displayId}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SupervisorCommandCenter;
