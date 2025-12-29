
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Delegate, HourActivity, DelegateType, UserRole, WeekendAbsence } from '../types';
import { getHours } from '../services/dataService';
import { firestoreService } from '../services/firestoreService';
import { useTranslation } from '../hooks/useTranslation';

const OperationsTools: React.FC = () => {
    const { data, setData, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<DelegateType>(DelegateType.Kafala);
    const [searchQuery, setSearchQuery] = useState('');
    const hours = getHours();

    const filteredDelegates = useMemo(() => {
        let list = data.delegates.filter(d => d.type === activeTab && d.employmentStatus === 'نشط' && !d.isDeleted);
        if (currentUser?.role === UserRole.OpsSupervisor) list = list.filter(d => d.supervisorId === currentUser.id);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(d => d.name.toLowerCase().includes(q) || d.displayId?.includes(q) || d.phone.includes(q));
        }
        return list;
    }, [data.delegates, activeTab, searchQuery, currentUser]);

    const handleUpdate = async (delegateId: number, updatedProps: Partial<Delegate>) => {
        setData(prev => ({
            ...prev,
            delegates: prev.delegates.map(d => d.id === delegateId ? { ...d, ...updatedProps } : d)
        }));
        const target = data.delegates.find(d => d.id === delegateId);
        if (target) await firestoreService.saveItem('delegates', { ...target, ...updatedProps });
    };

    const toggleWeekend = async (delegateId: number, day: keyof WeekendAbsence) => {
        const delegate = data.delegates.find(d => d.id === delegateId);
        if (!delegate) return;
        const currentWeekend = delegate.weekendAbsence || { thursday: false, friday: false, saturday: false };
        const updatedWeekend = { ...currentWeekend, [day]: !currentWeekend[day] };
        await handleUpdate(delegateId, { weekendAbsence: updatedWeekend });
    };

    const handleActivityClick = (delegateId: number, hour: string, currentStatus: HourActivity) => {
        // دورة الحالات: حاضر -> غائب -> إجازة -> غير محدد
        let nextStatus: HourActivity = null;
        if (currentStatus === null) nextStatus = 'Present';
        else if (currentStatus === 'Present') nextStatus = 'Absent';
        else if (currentStatus === 'Absent') nextStatus = 'OnLeave';
        else if (currentStatus === 'OnLeave') nextStatus = null;

        const delegate = data.delegates.find(d => d.id === delegateId);
        if (delegate) {
            let newActivity = [...(delegate.activity || [])];
            const idx = newActivity.findIndex(a => a.hour === hour);
            if (idx !== -1) newActivity[idx].status = nextStatus;
            else newActivity.push({ hour, status: nextStatus });
            handleUpdate(delegateId, { activity: newActivity });
        }
    };

    const handleWhatsApp = (delegate: Delegate) => {
        if (!delegate.phone) return;
        const phone = delegate.phone.startsWith('0') ? '966' + delegate.phone.substring(1) : delegate.phone;
        const message = `السلام عليكم يا بطل 👋\nالمندوب: ${delegate.name}\nمعك الإدارة التشغيلية لشركة إمداد-X. يرجى مراجعة نظام المهام والتأكد من تواجدك الميداني.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24" dir="rtl">
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter">مركز الرصد العملياتي</h1>
                    <p className="text-orange-500 text-sm font-bold mt-1 tracking-tight">متابعة الحضور اليومي وغيابات الويكند لـ ({activeTab})</p>
                </div>
                <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                    {[DelegateType.Kafala, DelegateType.Ajir].map(type => (
                        <button key={type} onClick={() => setActiveTab(type)} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${activeTab === type ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-card overflow-hidden rounded-3xl border-slate-800 shadow-2xl">
                <div className="p-4 bg-slate-900/80 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <i className="fas fa-search absolute top-1/2 -translate-y-1/2 right-5 text-slate-500"></i>
                        <input type="text" placeholder="ابحث باسم المندوب..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="input-styled w-full pr-14 py-4 text-sm font-bold rounded-2xl bg-black/20" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
                        <i className="fas fa-info-circle text-orange-500"></i>
                        <span>انقر على حالة الحضور للتغيير (حاضر / غائب / إجازة)</span>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                            <tr>
                                <th className="p-6">المندوب</th>
                                <th className="p-6 text-center">المعرف</th>
                                <th className="p-6 text-center">تواصل</th>
                                <th className="p-6 text-center text-orange-400">غياب الويكند (خ/ج/س)</th>
                                <th className="p-6 text-center">الطلبات</th>
                                {hours.map(h => <th key={h} className="p-6 text-center min-w-[140px]">{h.split(' - ')[0]}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredDelegates.map(d => (
                                <tr key={d.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <img src={d.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.id}`} className="w-11 h-11 rounded-xl object-cover border-2 border-slate-800 shadow-lg" alt="" />
                                            <span className="font-black text-white text-xs whitespace-nowrap">{d.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className="font-mono text-orange-500 font-black text-lg bg-orange-500/5 px-3 py-1 rounded-lg border border-orange-500/10">{d.displayId}</span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <button 
                                            onClick={() => handleWhatsApp(d)}
                                            className="w-10 h-10 rounded-xl bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white transition-all shadow-sm flex items-center justify-center mx-auto"
                                            title="تواصل واتساب"
                                        >
                                            <i className="fab fa-whatsapp text-xl"></i>
                                        </button>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="flex justify-center gap-1.5">
                                            {(['thursday', 'friday', 'saturday'] as const).map(day => (
                                                <button 
                                                    key={day} 
                                                    onClick={() => toggleWeekend(d.id, day)}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] border-2 transition-all ${d.weekendAbsence?.[day] ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                                >
                                                    {day === 'thursday' ? 'خ' : day === 'friday' ? 'ج' : 'س'}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <input type="number" value={d.ordersDelivered ?? ''} onChange={e=>handleUpdate(d.id, { ordersDelivered: parseInt(e.target.value) || 0 })} className="w-16 bg-black/40 border border-slate-800 rounded-xl py-2 text-center font-black text-sm text-indigo-400 focus:border-indigo-500 transition-all" />
                                    </td>
                                    {hours.map(h => {
                                        const status = d.activity?.find(a => a.hour === h)?.status || null;
                                        return (
                                            <td key={h} className="p-3">
                                                <button 
                                                    onClick={() => handleActivityClick(d.id, h, status)}
                                                    className={`w-full py-3 rounded-xl font-black text-[10px] border-2 transition-all flex flex-col items-center justify-center gap-1 h-14 ${
                                                        status === 'Present' ? 'bg-green-600/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 
                                                        status === 'Absent' ? 'bg-red-600/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 
                                                        status === 'OnLeave' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30' :
                                                        'bg-slate-800/40 text-slate-600 border-slate-700'
                                                    }`}
                                                >
                                                    <span className="text-[11px]">
                                                        {status === 'Present' ? 'حاضر ✅' : status === 'Absent' ? 'غائب ❌' : status === 'OnLeave' ? 'إجازة 🏝️' : 'رصد +'}
                                                    </span>
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OperationsTools;
