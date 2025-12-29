
import { AppData, PerformanceStatus, AjirDelegateStatus, DelegateType, RequestType, RequestStatus, UserRole, DelegateRequestTopic, Request, Staff } from '../types';

const HOURS = [
    '12:00 م - ذروة الغداء',
    '07:00 م - ذروة الوجبات',
    '11:00 م - ذروة العشاء'
];

export const getOperationalDate = (dateInput: Date | string = new Date()): string => {
    const date = new Date(dateInput);
    if (date.getHours() < 3) {
        date.setDate(date.getDate() - 1);
    }
    return date.toISOString().split('T')[0];
};

export const generateRequestNumber = (type: RequestType, existingRequests: Request[]): string => {
    let prefix = '';
    switch (type) {
        case RequestType.Internal:
            prefix = 'D0';
            break;
        case RequestType.DirectDirective:
            prefix = 'T0';
            break;
        case RequestType.Employee:
            prefix = 'M0';
            break;
        default:
            prefix = 'R0';
    }

    const relevantRequests = existingRequests.filter(r => r.requestNumber.startsWith(prefix));
    const maxId = relevantRequests.reduce((max, r) => {
        const numStr = r.requestNumber.slice(prefix.length);
        const num = parseInt(numStr, 10);
        return !isNaN(num) && num > max ? num : max;
    }, 0);
    
    return `${prefix}${maxId + 1}`;
};


export const initialData: AppData = {
    staff: [
        { id: 1, name: 'المدير العام', phone: '0510000001', password: 'gm123', requiresPasswordChange: true, nationalId: '1111111111', idExpiryDate: '2030-01-01', role: UserRole.GeneralManager, imageUrl: 'https://placehold.co/100x100/3498DB/FFFFFF/png?text=GM' },
        { id: 2, name: 'مدير الحركه والتشغيل', phone: '0510000002', password: 'em123', requiresPasswordChange: true, nationalId: '2222222222', idExpiryDate: '2030-01-01', role: UserRole.MovementManager, imageUrl: 'https://placehold.co/100x100/9B59B6/FFFFFF/png?text=EM' },
        { id: 20, name: 'اداره الموارد البشريه', phone: '0510000020', password: 'hr123', requiresPasswordChange: true, nationalId: '4444444444', idExpiryDate: '2030-01-01', role: UserRole.HR, imageUrl: 'https://placehold.co/100x100/1ABC9C/FFFFFF/png?text=HR' },
        { id: 30, name: 'الادارة المالية', phone: '0510000030', password: 'fin123', requiresPasswordChange: true, nationalId: '5555555555', idExpiryDate: '2030-01-01', role: UserRole.Finance, imageUrl: 'https://placehold.co/100x100/F1C40F/FFFFFF/png?text=FN' },
        { id: 40, name: 'الشوؤن القانونية', phone: '0510000040', password: 'legal123', requiresPasswordChange: true, nationalId: '6666666666', idExpiryDate: '2030-01-01', role: UserRole.Legal, imageUrl: 'https://placehold.co/100x100/E74C3C/FFFFFF/png?text=LG' },
    ],
    delegates: [],
    settings: {
        weekendDeduction: 200,
    },
    requests: [],
    dailyReports: [],
    circulars: [],
};

export const getHours = () => HOURS;
