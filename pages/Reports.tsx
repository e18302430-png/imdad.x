
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { DelegateType, UserRole } from '../types';
import { useTranslation } from '../hooks/useTranslation';

const Reports: React.FC = () => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const supervisors = useMemo(() => data.staff.filter(s => s.role === UserRole.OpsSupervisor), [data.staff]);

    const processedData = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        
        const statsMap = new Map<number, { orders: number, commSum: number, count: number, violations: string[] }>();
        
        data.dailyReports?.forEach(report => {
            const rDate = new Date(report.date);
            if (rDate >= start && rDate <= end) {
                report.entries.forEach(e => {
                    const cur = statsMap.get(e.delegateId) || { orders: 0, commSum: 0, count: 0, violations: [] };
                    cur.orders += e.ordersDelivered;
                    cur.commSum += (e.commitmentScore || 0);
                    cur.count += 1;
                    if (e.violations && e.violations !== "لا يوجد") cur.violations.push(`${report.date}: ${e.violations}`);
                    statsMap.set(e.delegateId, cur);
                });
            }
        });

        return data.delegates.filter(d => !d.isDeleted).map(d => {
            const s = statsMap.get(d.id) || { orders: 0, commSum: 0, count: 1, violations: [] };
            return {
                ...d,
                aggOrders: s.orders,
                avgComm: Math.round(s.commSum / s.count),
                allViolations: s.violations.length > 0 ? s.violations.join(' | ') : 'سجل نظيف'
            };
        }).filter(d => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return d.name.toLowerCase().includes(q) || d.displayId?.includes(q) || d.phone.includes(q);
        });
    }, [data.delegates, data.dailyReports, dateRange, searchQuery]);

    return (
        <div className="space-y-6 animate-fade-in pb-20" dir="rtl">
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-black text-white italic">سجل الأداء اللوجستي الشامل</h1>
                    <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">تحليل الحضور والمخالفات لكافة المناديب (كفالة / أجير)</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex gap-2">
                        <input type="date" value={dateRange.start} onChange={e=>setDateRange(p=>({...p, start:e.target.value}))} className="input-styled text-xs py-2 bg-black/40 border-white/5" />
                        <input type="date" value={dateRange.end} onChange={e=>setDateRange(p=>({...p, end:e.target.value}))} className="input-styled text-xs py-2 bg-black/40 border-white/5" />
                    </div>
                    <input type="text" placeholder="بحث بالاسم أو المعرف أو الجوال..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="input-styled text-xs py-3 w-64 bg-black/20" />
                </div>
            </div>

            <div className="glass-card p-6 border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase border-b border-white/5">
                            <tr>
                                <th className="p-5 text-right">المندوب (النوع)</th>
                                <th className="p-5">المعرف (ID)</th>
                                <th className="p-5">رقم الجوال</th>
                                <th className="p-5">متوسط الالتزام</th>
                                <th className="p-5">إجمالي الطلبات</th>
                                <th className="p-5 min-w-[300px]">سجل المخالفات المتراكم</th>
                                <th className="p-5">المشرف</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {processedData.map(d => (
                                <tr key={d.id} className="hover:bg-white/5 transition-all group">
                                    <td className="p-5 text-right">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-10 rounded-full ${d.avgComm > 80 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div>
                                                <p className="font-black text-white text-xs">{d.name}</p>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${d.type === 'كفالة' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'}`}>{d.type}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className="font-mono font-black text-xl text-orange-500 bg-orange-500/5 px-4 py-1.5 rounded-xl">{d.displayId}</span>
                                    </td>
                                    <td className="p-5 font-black text-slate-300 font-mono text-lg">{d.phone}</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-lg font-black text-sm ${d.avgComm > 80 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {d.avgComm}%
                                        </span>
                                    </td>
                                    <td className="p-5 font-black text-white text-xl">{d.aggOrders}</td>
                                    <td className="p-5">
                                        <div className="text-[10px] text-slate-500 italic group-hover:text-slate-300 transition-colors leading-relaxed">
                                            {d.allViolations}
                                        </div>
                                    </td>
                                    <td className="p-5 text-xs font-black text-slate-400">{supervisors.find(s=>s.id===d.supervisorId)?.name || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
