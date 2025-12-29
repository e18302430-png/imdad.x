
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Delegate, UserRole, PerformanceStatus, DelegateType, WeekendAbsence } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import HRAddDelegateModal from '../components/HRAddDelegateModal';
import { firestoreService } from '../services/firestoreService';
import ConfirmationModal from '../components/ConfirmationModal';

const HRDelegateManagement: React.FC = () => {
    const { data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    
    const [activeStatusTab, setActiveStatusTab] = useState<'active' | 'suspended' | 'resigned' | 'deleted'>('active');
    const [activeTypeTab, setActiveTypeTab] = useState<DelegateType | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [delegateToEdit, setDelegateToEdit] = useState<Delegate | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; delegate: Delegate | null }>({ isOpen: false, delegate: null });

    const normalize = (txt: any) => String(txt || "").trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').toLowerCase();

    const filteredList = useMemo(() => {
        let list = data.delegates;
        
        if (activeStatusTab === 'deleted') {
            list = list.filter(d => d.isDeleted === true);
        } else {
            list = list.filter(d => !d.isDeleted);
            if (activeStatusTab === 'active') list = list.filter(d => d.employmentStatus === 'نشط' && d.performanceStatus !== PerformanceStatus.Suspended);
            else if (activeStatusTab === 'suspended') list = list.filter(d => d.performanceStatus === PerformanceStatus.Suspended);
            else if (activeStatusTab === 'resigned') list = list.filter(d => d.employmentStatus === 'مستقيل');
        }

        if (activeTypeTab !== 'all') {
            list = list.filter(d => d.type === activeTypeTab);
        }

        if (searchQuery) {
            const q = normalize(searchQuery);
            list = list.filter(d => normalize(d.name).includes(q) || d.phone.includes(q) || d.displayId?.includes(q));
        }
        return list;
    }, [data.delegates, activeStatusTab, activeTypeTab, searchQuery]);

    const supervisors = useMemo(() => data.staff.filter(s => s.role === UserRole.OpsSupervisor), [data.staff]);

    const toggleWeekend = async (delegateId: number, day: keyof WeekendAbsence) => {
        const delegate = data.delegates.find(d => d.id === delegateId);
        if (!delegate) return;
        
        const currentWeekend = delegate.weekendAbsence || { thursday: false, friday: false, saturday: false };
        const updatedWeekend = { ...currentWeekend, [day]: !currentWeekend[day] };
        const updatedDelegate = { ...delegate, weekendAbsence: updatedWeekend };
        
        setData(prev => ({ 
            ...prev, 
            delegates: prev.delegates.map(d => d.id === delegateId ? updatedDelegate : d) 
        }));
        await firestoreService.saveItem('delegates', updatedDelegate);
    };

    const handleSaveDelegate = async (delegateData: Omit<Delegate, 'id'>) => {
        if (delegateToEdit) {
            const updated = { ...delegateToEdit, ...delegateData };
            await firestoreService.saveItem('delegates', updated);
            setData(prev => ({ ...prev, delegates: prev.delegates.map(d => d.id === delegateToEdit.id ? updated : d) }));
        } else {
            const newId = Date.now();
            const newDelegate = { ...delegateData, id: newId };
            await firestoreService.saveItem('delegates', newDelegate);
            setData(prev => ({ ...prev, delegates: [...prev.delegates, newDelegate] }));
        }
        setIsAddModalOpen(false);
        setDelegateToEdit(null);
    };

    const handleSoftDelete = async () => {
        if (!deleteModal.delegate) return;
        const updated = { ...deleteModal.delegate, isDeleted: true, deletedAt: new Date().toISOString() };
        await firestoreService.saveItem('delegates', updated);
        setData(prev => ({ ...prev, delegates: prev.delegates.map(d => d.id === updated.id ? updated : d) }));
        setDeleteModal({ isOpen: false, delegate: null });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10" dir="rtl">
            <ConfirmationModal 
                isOpen={deleteModal.isOpen} 
                title="تأكيد الحذف"
                message={`هل تريد نقل المندوب ${deleteModal.delegate?.name} للسلة؟`}
                onConfirm={handleSoftDelete}
                onClose={() => setDeleteModal({ isOpen: false, delegate: null })}
            />

            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter">إدارة الموارد الميدانية</h1>
                    <p className="text-orange-500 text-sm font-bold flex items-center gap-2">
                        <i className="fas fa-users-gear"></i> ضبط بيانات وغيابات الويكند (أجير وكفالة)
                    </p>
                </div>
                <button onClick={() => { setDelegateToEdit(null); setIsAddModalOpen(true); }} className="btn-primary px-10 py-4 rounded-2xl shadow-xl font-black transition-all hover:scale-105 active:scale-95">
                    إضافة مندوب جديد +
                </button>
            </div>

            <div className="glass-card overflow-hidden border-slate-800 shadow-2xl">
                <div className="p-4 bg-slate-900/80 border-b border-white/5 flex flex-col xl:flex-row justify-between gap-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                            {['active', 'suspended', 'resigned', 'deleted'].map((tab) => (
                                <button key={tab} onClick={() => setActiveStatusTab(tab as any)} className={`px-6 py-2.5 rounded-lg text-[11px] font-black transition-all ${activeStatusTab === tab ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                    {tab === 'active' ? 'النشطون' : tab === 'suspended' ? 'الموقوفون' : tab === 'resigned' ? 'المستقيلون' : 'السلة'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <i className="fas fa-search absolute top-1/2 -translate-y-1/2 right-4 text-slate-500"></i>
                        <input type="text" placeholder="بحث بالاسم أو المعرف..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-styled w-full xl:w-80 pr-12 py-3.5 text-sm font-bold rounded-2xl bg-black/20" />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full text-right border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400">
                            <tr className="text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                <th className="p-6">المندوب</th>
                                <th className="p-6 text-center">المعرف</th>
                                <th className="p-6 text-center text-orange-400">غياب الويكند (خ/ج/س)</th>
                                <th className="p-6 text-center">النوع</th>
                                <th className="p-6 text-right">المشرف</th>
                                <th className="p-6 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredList.map(d => (
                                <tr key={d.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-4">
                                            <img src={d.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.id}`} className="w-12 h-12 rounded-2xl border-2 border-slate-800 object-cover shadow-lg" alt="" />
                                            <div>
                                                <p className="font-black text-white text-sm">{d.name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{d.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className="font-mono font-black text-orange-500 bg-orange-500/5 px-3 py-1.5 rounded-xl border border-orange-500/10">{d.displayId}</span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="flex justify-center gap-2">
                                            {(['thursday', 'friday', 'saturday'] as const).map(day => (
                                                <button 
                                                    key={day} 
                                                    onClick={() => toggleWeekend(d.id, day)} 
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[11px] border-2 transition-all ${d.weekendAbsence?.[day] ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                                >
                                                    {day === 'thursday' ? 'خ' : day === 'friday' ? 'ج' : 'س'}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${d.type === DelegateType.Kafala ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'}`}>
                                            {d.type}
                                        </span>
                                    </td>
                                    <td className="p-5 text-slate-400 text-right font-black text-[11px]">
                                        {supervisors.find(s => s.id === d.supervisorId)?.name || 'غير معين'}
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setDelegateToEdit(d); setIsAddModalOpen(true); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600 transition-all shadow-sm"><i className="fas fa-edit"></i></button>
                                            <button onClick={() => setDeleteModal({ isOpen: true, delegate: d })} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 transition-all"><i className="fas fa-trash-alt"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAddModalOpen && (
                <HRAddDelegateModal
                    onSave={handleSaveDelegate}
                    onClose={() => { setIsAddModalOpen(false); setDelegateToEdit(null); }}
                    staff={data.staff}
                    delegateToEdit={delegateToEdit}
                />
            )}
        </div>
    );
};

export default HRDelegateManagement;
