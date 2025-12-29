
export enum PerformanceStatus {
    Excellent = 'ممتاز',
    Average = 'متوسط',
    Weak = 'ضعيف',
    Suspended = 'موقوف'
}

export enum OperationalStatus {
    Active = 'Active',      // شغال
    Idle = 'Idle',          // خامل
    Warning = 'Warning',    // تحذير
    Moving = 'Moving',       // تنبيه للتحرك
    Elite = 'Elite'         // مندوب مجتهد/بطل
}

export enum AjirDelegateStatus {
    Available = 'متاح',
    OnDuty = 'في مهمة',
    Inactive = 'غير نشط',
}

export enum DelegateType {
    Kafala = 'كفالة',
    Ajir = 'أجير'
}

export type HourActivity = 'Present' | 'Absent' | 'OnLeave' | null;

export interface DelegateActivity {
    hour: string;
    status: HourActivity;
}

export interface WeekendAbsence {
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
}

export interface Delegate {
    id: number;
    name: string;
    phone: string;
    password: string;
    requiresPasswordChange?: boolean;
    nationalId?: string;
    imageUrl?: string;
    iqamaPhotoUrl?: string;
    licensePhotoUrl?: string;
    iqamaExpiryDate?: string;
    licenseExpiryDate?: string;
    supervisorId: number;
    type: DelegateType;
    latitude: number;
    longitude: number;
    currentAssignment?: string;
    displayId?: string;
    ordersDelivered?: number;
    violations?: string; 
    joinDate?: string; 
    terminationDate?: string;
    employmentStatus: 'نشط' | 'مستقيل';
    
    carPlateNumber?: string;
    rentalCompany?: string;
    
    suspensionDate?: string;
    suspensionReturnDate?: string;

    lastShiftStartTime?: string;
    lastShiftFacePhoto?: string;
    lastShiftCarPhoto?: string;

    performanceStatus?: PerformanceStatus;
    manualStatus?: OperationalStatus; 
    activity?: DelegateActivity[];
    weekendAbsence?: WeekendAbsence;
    notes?: string;
    dailyReport?: string;
    
    ajirStatus?: AjirDelegateStatus;

    isDeleted?: boolean;
    deletedAt?: string;
}

export enum UserRole {
    GeneralManager = 'GeneralManager',
    MovementManager = 'MovementManager',
    OpsSupervisor = 'OpsSupervisor',
    HR = 'HR',
    Finance = 'Finance',
    Legal = 'Legal'
}

export interface Staff {
    id: number;
    name: string;
    phone: string;
    password: string;
    requiresPasswordChange?: boolean;
    nationalId: string;
    idExpiryDate: string;
    joinDate?: string;
    role: UserRole;
    imageUrl?: string;
    iqamaPhotoUrl?: string;
    licensePhotoUrl?: string;
}

export interface AppSettings {
    weekendDeduction: number;
}

export interface DailyReportEntry {
    delegateId: number;
    ordersDelivered: number;
    violations?: string;
    activity: DelegateActivity[];
    weekendAbsence?: WeekendAbsence;
    delegateName: string; 
    delegateDisplayId?: string;
    commitmentScore: number; // نسبة الالتزام (0-100) بناءً على الحضور
    isSupervisorVerified: boolean; // هل تم تحضيره يدوياً من قبل المشرف؟
}

export interface DailyOperationalReport {
    id?: string;
    date: string;
    supervisorId: number;
    entries: DailyReportEntry[];
}

export enum RequestType {
    Internal = 'Internal',
    Employee = 'Employee',
    DirectDirective = 'DirectDirective'
}

export enum RequestStatus {
    PendingApproval = 'PendingApproval',
    Approved = 'Approved',
    Rejected = 'Rejected',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export enum DelegateRequestTopic {
    Leave = 'Leave',
    Financial = 'Financial',
    Clearance = 'Clearance',
    ConfidentialComplaint = 'ConfidentialComplaint',
    ContactSupervisor = 'ContactSupervisor',
    Other = 'Other'
}

// FIX: Added RequestHistoryEvent and RequestDirectiveResponse interfaces
export interface RequestHistoryEvent {
    actor: UserRole | 'Delegate';
    actorName: string;
    action: 'Created' | 'Approved' | 'Rejected' | 'Commented' | 'ResolvedAndClosed' | 'Cancelled' | 'ResolvedAndDirected' | 'DirectiveViewed' | 'DirectiveReplied';
    timestamp: string;
    comment?: string;
    directedTo?: UserRole;
}

export interface RequestDirectiveResponse {
    comment: string;
    imageUrl?: string;
    timestamp: string;
}

export interface Request {
    id: number;
    requestNumber: string;
    title: string;
    description: string;
    type: RequestType;
    status: RequestStatus;
    fromRole?: UserRole;
    fromDelegateId?: number;
    toDelegateId?: number; 
    createdAt: string;
    lastActionTimestamp: string;
    history: RequestHistoryEvent[];
    imageUrl?: string; 
    topic?: DelegateRequestTopic;
    workflow: UserRole[];
    currentStageIndex: number;
    directiveResponse?: RequestDirectiveResponse;
}

export interface Circular {
    id: number;
    title: string;
    content: string;
    authorRole: UserRole;
    authorName: string;
    audience: 'all' | 'delegates';
    createdAt: string;
}

export interface AppData {
    staff: Staff[];
    delegates: Delegate[];
    settings: AppSettings;
    requests: Request[];
    dailyReports: DailyOperationalReport[];
    circulars: Circular[];
}

export type CurrentUser = Staff;
