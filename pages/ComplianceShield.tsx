
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserRole } from '../types';

type DocumentStatus = 'valid' | 'expiringSoon' | 'expired';

// Helper function to format Gregorian date and add Hijri date
const formatDateWithHijri = (dateString?: string): string => {
    if (!dateString || dateString.trim() === '') return '-';
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    
    const gregorian = date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    });
    const hijri = hijriFormatter.format(date);

    return `${gregorian} (${hijri})`;
};

const getDocumentStatus = (expiryDate?: string): DocumentStatus => {
    if (!expiryDate) return 'valid';
    const today = new Date();
    const expiry = new Date(expiryDate);
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 30) return 'expiringSoon';
    return 'valid';
};

const StatCard: React.FC<{ title: string; value: number; icon: string; color: 'green' | 'yellow' | 'red' }> = ({ title, value, icon, color }) => {
    const colorClasses = {
        green: 'text-green-400 border-green-500/30',
        yellow: 'text-yellow-400 border-yellow-500/30',
        red: 'text-red-400 border-red-500/30',
    };

    return (
        <div className={`glass-card p-6 border-r-4 ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-md">{title}</p>
                    <p className="text-3xl font-bold">{value}</p>
                </div>
                <div className={`text-4xl opacity-50 ${colorClasses[color]}`}>
                    <i className={`fas ${icon}`}></i>
                </div>
            </div>
        </div>
    );
};

const StatusIndicator: React.FC<{ 
    status: DocumentStatus, 
    date: string, 
    imageUrl?: string, 
    onViewImage: (url: string, title: string) => void,
    title: string 
}> = ({ status, date, imageUrl, onViewImage, title }) => {
    const { t } = useTranslation();
    const statusInfo: Record<DocumentStatus, { text: string, color: string }> = {
        valid: { text: t('valid'), color: 'bg-green-500/20 text-green-300' },
        expiringSoon: { text: t('expiringSoon'), color: 'bg-yellow-500/20 text-yellow-300 animate-pulse' },
        expired: { text: t('expired'), color: 'bg-red-500/20 text-red-300' },
    };
    
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusInfo[status].color}`}>
                    {statusInfo[status].text}
                </span>
                {imageUrl ? (
                    <button 
                        onClick={() => onViewImage(imageUrl, title)}
                        className="w-7 h-7 rounded-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 flex items-center justify-center transition-colors border border-blue-500/30"
                        title={t('openAttachment')}
                    >
                        <i className="fas fa-eye text-xs"></i>
                    </button>
                ) : (
                    <span className="w-7 h-7 rounded-full bg-gray-700/30 flex items-center justify-center text-gray-500 cursor-not-allowed" title="No Image">
                        <i className="fas fa-image-slash text-xs"></i>
                    </span>
                )}
            </div>
            <span className="text-xs text-gray-400 font-mono">{date}</span>
        </div>
    );
};

// Image Modal Component
const DocumentModal: React.FC<{ imageUrl: string; title: string; onClose: () => void }> = ({ imageUrl, title, onClose }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="glass-card max-w-3xl w-full p-1 flex flex-col gap-2 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800/50">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-700/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="flex justify-center bg-black rounded-lg overflow-hidden relative group">
                    <img src={imageUrl} alt={title} className="max-h-[80vh] w-auto object-contain" />
                </div>
                <div className="flex justify-end p-3 bg-gray-800/50">
                    <a href={imageUrl} download={`${title}.png`} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                        <i className="fas fa-download"></i> {t('download') || 'Download'}
                    </a>
                </div>
            </div>
        </div>
    );
};

const ComplianceShield: React.FC = () => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();
    const [viewDoc, setViewDoc] = useState<{ url: string, title: string } | null>(null);

    const supervisors = useMemo(() => data.staff.filter(s => s.role === UserRole.OpsSupervisor), [data.staff]);
    
    const delegateDocumentStatuses = useMemo(() => {
        return data.delegates.map(delegate => ({
            ...delegate,
            iqamaStatus: getDocumentStatus(delegate.iqamaExpiryDate),
            licenseStatus: getDocumentStatus(delegate.licenseExpiryDate),
        }));
    }, [data.delegates]);

    const stats = useMemo(() => {
        const stats = {
            valid: 0,
            expiringSoon: 0,
            expired: 0,
        };
        const processedDelegates = new Set<number>();

        delegateDocumentStatuses.forEach(d => {
            if (processedDelegates.has(d.id)) return;

            const hasExpired = d.iqamaStatus === 'expired' || d.licenseStatus === 'expired';
            const hasExpiring = d.iqamaStatus === 'expiringSoon' || d.licenseStatus === 'expiringSoon';

            if(hasExpired) {
                stats.expired++;
            } else if (hasExpiring) {
                stats.expiringSoon++;
            } else {
                stats.valid++;
            }
            processedDelegates.add(d.id);
        });
        return stats;
    }, [delegateDocumentStatuses]);

    return (
        <div className="space-y-6 animate-fade-in">
            {viewDoc && (
                <DocumentModal 
                    imageUrl={viewDoc.url} 
                    title={viewDoc.title} 
                    onClose={() => setViewDoc(null)} 
                />
            )}

            <h1 className="text-3xl font-bold text-white">{t('complianceShield')}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t('valid')} value={stats.valid} icon="fa-check-circle" color="green" />
                <StatCard title={t('expiringSoon')} value={stats.expiringSoon} icon="fa-exclamation-triangle" color="yellow" />
                <StatCard title={t('expired')} value={stats.expired} icon="fa-times-circle" color="red" />
            </div>

            <div className="glass-card p-4 overflow-x-auto">
                 <h2 className="text-xl font-semibold text-white mb-4 px-2 border-l-4 border-orange-500 pl-3">{t('delegateDocuments')}</h2>
                <table className="min-w-full text-sm text-center">
                    <thead className="border-b border-gray-700 text-gray-400 bg-gray-800/30">
                        <tr>
                            <th scope="col" className="p-3 ltr:text-left rtl:text-right">{t('delegateName')}</th>
                            <th scope="col" className="p-3">{t('nationalId')}</th>
                            <th scope="col" className="p-3">{t('delegateID')}</th>
                            <th scope="col" className="p-3">{t('supervisorInCharge')}</th>
                            <th scope="col" className="p-3">{t('iqamaStatus')}</th>
                            <th scope="col" className="p-3">{t('licenseStatus')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {delegateDocumentStatuses.length > 0 ? delegateDocumentStatuses.map(delegate => (
                            <tr key={delegate.id} className="border-b border-gray-800 hover:bg-orange-500/5 transition-colors">
                                <td className="p-3 font-semibold ltr:text-left rtl:text-right flex items-center gap-3">
                                    <img src={delegate.imageUrl} alt={delegate.name} className="w-10 h-10 rounded-full object-cover border border-gray-600"/>
                                    {delegate.name}
                                </td>
                                <td className="p-3 font-mono">{delegate.nationalId || '-'}</td>
                                <td className="p-3">{delegate.displayId || '-'}</td>
                                <td className="p-3 text-gray-400">{supervisors.find(s => s.id === delegate.supervisorId)?.name || 'N/A'}</td>
                                <td className="p-3">
                                    <StatusIndicator 
                                        status={delegate.iqamaStatus} 
                                        date={formatDateWithHijri(delegate.iqamaExpiryDate)}
                                        imageUrl={delegate.iqamaPhotoUrl}
                                        title={`${t('iqamaPhoto')} - ${delegate.name}`}
                                        onViewImage={(url, title) => setViewDoc({ url, title })}
                                    />
                                </td>
                                <td className="p-3">
                                     <StatusIndicator 
                                        status={delegate.licenseStatus} 
                                        date={formatDateWithHijri(delegate.licenseExpiryDate)} 
                                        imageUrl={delegate.licensePhotoUrl}
                                        title={`${t('licensePhoto')} - ${delegate.name}`}
                                        onViewImage={(url, title) => setViewDoc({ url, title })}
                                    />
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    {t('noActiveDelegates')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComplianceShield;
