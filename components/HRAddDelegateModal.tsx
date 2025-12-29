
import React, { useState, useEffect, useMemo } from 'react';
import { DelegateType, type Delegate, type Staff, PerformanceStatus, UserRole } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { getHours } from '../services/dataService';
import LoadingSpinner from './LoadingSpinner';

interface HRAddDelegateModalProps {
    onSave: (newDelegate: Omit<Delegate, 'id'>) => void;
    onClose: () => void;
    staff: Staff[];
    delegateToEdit?: Delegate | null;
}

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject("Canvas error");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const FileInputWithPreview: React.FC<{
    id: string; label: string; onFileChange: (file: File | null) => void; initialUrl?: string;
}> = ({ id, label, onFileChange, initialUrl }) => {
    const [preview, setPreview] = useState<string | null>(initialUrl || null);
    const [fileName, setFileName] = useState<string>('');
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
            onFileChange(file);
        }
    };
    return (
        <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 hover:border-orange-500/50 transition-all flex flex-col h-full shadow-inner">
            <label className="text-xs font-black text-gray-400 uppercase mb-4 block tracking-widest">{label}</label>
            <div className="flex items-center gap-4 mt-auto">
                <label htmlFor={id} className="flex-grow cursor-pointer bg-gray-700/50 hover:bg-gray-600/50 text-white text-xs py-4 px-2 rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center gap-2 transition-all">
                    <i className="fas fa-camera text-orange-500 text-lg"></i>
                    <span className="truncate max-w-[100px]">{fileName || "اختر صورة"}</span>
                </label>
                <input type="file" id={id} accept="image/*" onChange={handleFileChange} className="hidden" />
                {preview && <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-orange-500 flex-shrink-0 shadow-lg"><img src={preview} alt="" className="w-full h-full object-cover" /></div>}
            </div>
        </div>
    );
};

const InputWithIcon: React.FC<{ icon: string; label: string; id: string; [key: string]: any }> = ({ icon, label, id, ...props }) => (
    <div className="space-y-1.5">
        <label htmlFor={id} className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">{label}</label>
        <div className="relative">
            <i className={`fas ${icon} absolute top-1/2 -translate-y-1/2 rtl:right-4 text-gray-500 text-sm`}></i>
            <input id={id} className="input-styled w-full rtl:pr-11 py-3 text-sm rounded-xl bg-gray-900/60 border-gray-700 focus:border-orange-500/50 transition-all" {...props} />
        </div>
    </div>
);

const HRAddDelegateModal: React.FC<HRAddDelegateModalProps> = ({ onSave, onClose, staff, delegateToEdit }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const supervisors = useMemo(() => staff.filter(s => s.role === UserRole.OpsSupervisor), [staff]);

    const [formData, setFormData] = useState({
        type: DelegateType.Kafala, name: '', nationalId: '', displayId: '', phone: '', supervisorId: '',
        joinDate: new Date().toISOString().split('T')[0], iqamaExpiryDate: '', licenseExpiryDate: '', status: 'Active', carPlate: '', rental: ''
    });

    const [files, setFiles] = useState<{ personal: File | null; iqama: File | null; license: File | null }>({ personal: null, iqama: null, license: null });

    useEffect(() => {
        if (delegateToEdit) {
            setFormData({
                type: delegateToEdit.type, name: delegateToEdit.name, nationalId: delegateToEdit.nationalId || '',
                displayId: delegateToEdit.displayId || '', phone: delegateToEdit.phone,
                supervisorId: delegateToEdit.supervisorId.toString(), joinDate: delegateToEdit.joinDate || '',
                iqamaExpiryDate: delegateToEdit.iqamaExpiryDate || '', licenseExpiryDate: delegateToEdit.licenseExpiryDate || '',
                status: delegateToEdit.employmentStatus === 'مستقيل' ? 'Resigned' : (delegateToEdit.performanceStatus === PerformanceStatus.Suspended ? 'Suspended' : 'Active'),
                carPlate: delegateToEdit.carPlateNumber || '', rental: delegateToEdit.rentalCompany || ''
            });
        }
    }, [delegateToEdit]);

    const handleNext = () => {
        setError('');
        if (currentStep === 1) {
            if (!formData.name || !formData.nationalId || !formData.phone || !formData.displayId) { setError("الرجاء إكمال جميع البيانات الأساسية."); return; }
        }
        if (currentStep === 2) {
            if (!formData.supervisorId) { setError("يجب تعيين مشرف للمندوب."); return; }
        }
        setCurrentStep(prev => prev + 1);
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            let imageUrl = delegateToEdit?.imageUrl || '';
            let iqamaUrl = delegateToEdit?.iqamaPhotoUrl || '';
            let licenseUrl = delegateToEdit?.licensePhotoUrl || '';

            if (files.personal) imageUrl = await compressImage(files.personal);
            if (files.iqama) iqamaUrl = await compressImage(files.iqama);
            if (files.license) licenseUrl = await compressImage(files.license);

            // كلمة السر التلقائية: آخر 4 أرقام من المعرف الداخلي
            const autoPassword = formData.displayId.slice(-4);

            onSave({
                ...delegateToEdit,
                name: formData.name, nationalId: formData.nationalId, displayId: formData.displayId, phone: formData.phone,
                password: delegateToEdit?.password || autoPassword, 
                requiresPasswordChange: delegateToEdit ? delegateToEdit.requiresPasswordChange : true,
                supervisorId: parseInt(formData.supervisorId), joinDate: formData.joinDate, iqamaExpiryDate: formData.iqamaExpiryDate,
                licenseExpiryDate: formData.licenseExpiryDate, carPlateNumber: formData.carPlate, rentalCompany: formData.rental,
                type: formData.type, imageUrl, iqamaPhotoUrl: iqamaUrl, licensePhotoUrl: licenseUrl,
                employmentStatus: formData.status === 'Resigned' ? 'مستقيل' : 'نشط',
                performanceStatus: formData.status === 'Suspended' ? PerformanceStatus.Suspended : PerformanceStatus.Average,
                latitude: 24.7136, longitude: 46.6753,
                activity: delegateToEdit?.activity || getHours().map(h => ({ hour: h, status: null })),
                weekendAbsence: delegateToEdit?.weekendAbsence || { thursday: false, friday: false, saturday: false }
            });
        } catch (e) { setError("حدث خطأ أثناء معالجة البيانات."); } finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-2 sm:p-4 backdrop-blur-xl" dir="rtl">
            <div className="glass-card w-full max-w-4xl max-h-[95vh] flex flex-col border-gray-700 shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
                    <div><h2 className="text-2xl font-black text-white">{delegateToEdit ? 'تحديث بيانات المندوب' : 'إضافة مندوب جديد'}</h2><div className="flex gap-2 mt-2">{[1, 2, 3].map(step => (<div key={step} className={`h-1 w-12 rounded-full transition-all duration-500 ${currentStep >= step ? 'bg-orange-500 shadow-[0_0_8px_orange]' : 'bg-gray-700'}`}></div>))}</div></div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-all"><i className="fas fa-times"></i></button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-sm animate-shake"><i className="fas fa-exclamation-circle"></i> {error}</div>}
                    {currentStep === 1 && (<div className="space-y-6 animate-fade-in"><div className="p-1 bg-gray-800/50 rounded-2xl flex border border-gray-700"><button onClick={() => setFormData({...formData, type: DelegateType.Kafala})} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${formData.type === DelegateType.Kafala ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500'}`}>كفالة</button><button onClick={() => setFormData({...formData, type: DelegateType.Ajir})} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${formData.type === DelegateType.Ajir ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500'}`}>أجير</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><InputWithIcon id="n" icon="fa-user" label="الاسم الكامل" value={formData.name} onChange={(e:any)=>setFormData({...formData, name: e.target.value})} /><InputWithIcon id="ni" icon="fa-id-card" label="رقم الإقامة / الهوية" value={formData.nationalId} maxLength={10} onChange={(e:any)=>setFormData({...formData, nationalId: e.target.value})} /><InputWithIcon id="di" icon="fa-fingerprint" label="المعرف الداخلي" value={formData.displayId} maxLength={10} onChange={(e:any)=>setFormData({...formData, displayId: e.target.value})} /><InputWithIcon id="p" icon="fa-phone" label="رقم الجوال" value={formData.phone} maxLength={10} onChange={(e:any)=>setFormData({...formData, phone: e.target.value})} /></div><p className="text-[10px] text-orange-400 italic">سيتم ضبط كلمة السر تلقائياً لتكون (آخر 4 أرقام من المعرف) وسيطلب منه تغييرها عند أول دخول.</p></div>)}
                    {currentStep === 2 && (<div className="space-y-6 animate-fade-in"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1.5"><label className="block text-[10px] font-black text-gray-400 uppercase mr-1 tracking-widest">المشرف المباشر</label><select value={formData.supervisorId} onChange={e => setFormData({...formData, supervisorId: e.target.value})} className="input-styled w-full py-3 rounded-xl bg-gray-900/60 border-gray-700"><option value="">اختر المشرف...</option>{supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><InputWithIcon id="jd" icon="fa-calendar" label="تاريخ الانضمام" type="date" value={formData.joinDate} onChange={(e:any)=>setFormData({...formData, joinDate: e.target.value})} /><InputWithIcon id="ie" icon="fa-id-card-clip" label="انتهاء الإقامة" type="date" value={formData.iqamaExpiryDate} onChange={(e:any)=>setFormData({...formData, iqamaExpiryDate: e.target.value})} /><InputWithIcon id="le" icon="fa-id-badge" label="انتهاء الرخصة" type="date" value={formData.licenseExpiryDate} onChange={(e:any)=>setFormData({...formData, licenseExpiryDate: e.target.value})} /><InputWithIcon id="cp" icon="fa-car" label="رقم اللوحة" value={formData.carPlate} onChange={(e:any)=>setFormData({...formData, carPlate: e.target.value})} /><div className="space-y-1.5"><label className="block text-[10px] font-black text-gray-400 uppercase mr-1 tracking-widest">الحالة التشغيلية</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-styled w-full py-3 rounded-xl bg-gray-900/60 border-gray-700"><option value="Active">نشط</option><option value="Suspended">موقوف</option><option value="Resigned">مستقيل</option></select></div></div></div>)}
                    {currentStep === 3 && (<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in"><FileInputWithPreview id="p_img" label="الصورة الشخصية" onFileChange={(f)=>setFiles({...files, personal: f})} initialUrl={delegateToEdit?.imageUrl} /><FileInputWithPreview id="i_img" label="صورة الإقامة" onFileChange={(f)=>setFiles({...files, iqama: f})} initialUrl={delegateToEdit?.iqamaPhotoUrl} /><FileInputWithPreview id="l_img" label="صورة الرخصة" onFileChange={(f)=>setFiles({...files, license: f})} initialUrl={delegateToEdit?.licensePhotoUrl} /></div>)}
                </div>
                <div className="p-6 border-t border-gray-800 bg-gray-900/80 flex justify-between items-center"><button onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep-1)} className="px-6 py-3 rounded-xl border border-gray-700 text-gray-400 font-bold hover:bg-gray-800">{currentStep === 1 ? 'إلغاء' : 'السابق'}</button>{currentStep < 3 ? (<button onClick={handleNext} className="btn-primary px-10 py-3 rounded-xl font-black">التالي <i className="fas fa-chevron-left mr-2"></i></button>) : (<button onClick={handleSubmit} disabled={isSaving} className="btn-primary px-10 py-3 rounded-xl font-black bg-orange-600 shadow-lg flex items-center gap-2">{isSaving ? <><LoadingSpinner /> جاري الحفظ...</> : 'حفظ البيانات النهائية'}</button>)}</div>
            </div>
        </div>
    );
};

export default HRAddDelegateModal;
