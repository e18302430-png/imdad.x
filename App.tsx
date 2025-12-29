
import React, { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AppContext, AppProvider } from './contexts/AppContext';
import { useTranslation } from './hooks/useTranslation';
import Dashboard from './pages/Dashboard';
import AdminBoard from './pages/AdminBoard';
import Login from './pages/Login';
import DelegateApp from './pages/DelegateApp';
import OperationsTools from './pages/OperationsTools';
import Reports from './pages/Reports';
import MyRequests from './pages/MyRequests';
import HRDelegateManagement from './pages/HRDelegateManagement';
import ComplianceShield from './pages/ComplianceShield';
import AllDelegates from './pages/AllDelegates';
import UserManagement from './pages/UserManagement';
import SelfPreparation from './pages/SelfPreparation';
import { initialData } from './services/dataService';
import { firestoreService } from './services/firestoreService';
import { db } from './services/firebaseConfig';
import type { Staff, AppData } from './types';
import { UserRole } from './types';
import LanguageSwitcher from './components/LanguageSwitcher';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<Staff | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [data, setRawData] = useState<AppData>(initialData);
    const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);

    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            try {
                if (db) {
                    const cloudData = await firestoreService.loadAppData();
                    if (cloudData) {
                        setRawData(cloudData);
                        setIsDbConnected(true);
                    } else {
                        setIsDbConnected(false);
                    }
                } else {
                    setIsDbConnected(false);
                }
            } catch (e) { 
                console.error("Initialization Error:", e);
                setIsDbConnected(false); 
            } finally {
                setIsLoading(false);
            }
        };
        initData();
    }, []);

    const setData: React.Dispatch<React.SetStateAction<AppData>> = useCallback((action) => {
        setRawData(prev => typeof action === 'function' ? action(prev) : action);
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.clear();
        sessionStorage.clear();
        setCurrentUser(null);
        if (window.location.hash !== '#/login') {
            window.location.hash = '#/login';
        }
    }, []);

    const value = useMemo(() => ({ 
        currentUser, setCurrentUser, data, setData, isDbConnected, handleLogout 
    }), [currentUser, data, isDbConnected, setData, handleLogout]);

    if (isLoading) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center flex-col gap-6">
            <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-orange-500 font-black tracking-widest animate-pulse uppercase">IMDAD-X LOADING</p>
        </div>
    );

    return (
        <AppProvider value={value}>
            <HashRouter>
                <Routes>
                    <Route path="/delegate-app" element={<DelegateApp />} />
                    {!currentUser ? (
                        <>
                            <Route path="/login" element={<Login />} />
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </>
                    ) : (
                        <Route path="/*" element={<MainLayout />} />
                    )}
                </Routes>
            </HashRouter>
        </AppProvider>
    );
};

const MainLayout: React.FC = () => {
    const { language } = useTranslation();
    
    useEffect(() => {
        const isRtl = ['ar', 'ur'].includes(language);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    }, [language]);

    return (
        <div className="flex min-h-screen bg-[#020617] relative overflow-hidden font-['Cairo'] text-white">
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen w-full relative overflow-hidden">
                <Header />
                <main className="flex-1 p-3 lg:p-8 overflow-y-auto custom-scrollbar relative z-0">
                    <div className="max-w-7xl mx-auto h-full">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/self-preparation" element={<SelfPreparation />} />
                            <Route path="/admin-board" element={<AdminBoard />} />
                            <Route path="/operations-tools" element={<OperationsTools />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/my-requests" element={<MyRequests />} />
                            <Route path="/hr-management" element={<HRDelegateManagement />} />
                            <Route path="/user-management" element={<UserManagement />} />
                            <Route path="/all-delegates" element={<AllDelegates />} />
                            <Route path="/compliance-shield" element={<ComplianceShield />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
}

const Sidebar = () => {
    const location = useLocation();
    const { currentUser, handleLogout } = useContext(AppContext);
    const { t } = useTranslation();
    const allRoles = Object.values(UserRole);

    const navLinks = [
        { path: '/', icon: 'fa-compass', label: t('strategicGuidance'), roles: allRoles },
        { path: '/self-preparation', icon: 'fa-user-check', label: 'رادار التحضير', roles: [UserRole.OpsSupervisor, UserRole.GeneralManager, UserRole.MovementManager] },
        { path: '/operations-tools', icon: 'fa-microchip', label: 'أدوات العمليات', roles: [UserRole.OpsSupervisor, UserRole.GeneralManager] },
        { path: '/my-requests', icon: 'fa-network-wired', label: 'قسم الطلبات', roles: allRoles },
        { path: '/hr-management', icon: 'fa-users-cog', label: 'إدارة المناديب', roles: [UserRole.HR, UserRole.GeneralManager, UserRole.MovementManager] },
        { path: '/user-management', icon: 'fa-users-gear', label: 'إدارة الموظفين', roles: [UserRole.GeneralManager, UserRole.HR] },
        { path: '/reports', icon: 'fa-chart-pie', label: 'التقارير', roles: allRoles },
        { path: '/compliance-shield', icon: 'fa-shield-alt', label: 'درع الالتزام', roles: allRoles },
    ];

    return (
        <div className="hidden md:flex w-64 bg-slate-900 border-r border-white/5 flex-col z-[50]">
            <div className="p-8 text-center">
                <h1 className="text-2xl font-black text-orange-500 tracking-tighter">IMDAD-X</h1>
            </div>
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navLinks.filter(l => l.roles.includes(currentUser?.role as UserRole)).map(link => (
                    <Link key={link.path} to={link.path} className={`flex items-center p-3 rounded-xl transition-all ${location.pathname === link.path ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
                        <i className={`fas ${link.icon} w-8 text-center`}></i>
                        <span className="font-bold text-xs">{link.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t border-white/5">
                <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                >
                    <i className="fas fa-power-off"></i>
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>
    );
};

const Header = () => {
    const { currentUser, handleLogout } = useContext(AppContext);
    const { t } = useTranslation();
    return (
        <header className="p-4 flex justify-between items-center bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[40] shadow-xl">
            <div className="md:hidden font-black text-orange-500 text-xl tracking-tighter">IMDAD-X</div>
            <div className="flex items-center gap-3 ml-auto">
                <LanguageSwitcher />
                <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
                    <div className="text-right hidden sm:block px-2">
                        <span className="font-black text-white block text-[10px]">{currentUser?.name}</span>
                        <span className="text-[8px] text-orange-500 block font-bold uppercase">{t(`role_${currentUser?.role}`)}</span>
                    </div>
                    {currentUser?.imageUrl && <img src={currentUser.imageUrl} className="w-9 h-9 rounded-xl border-2 border-orange-500/50 object-cover" alt="" />}
                    <button 
                        onClick={handleLogout} 
                        className="bg-red-600 text-white w-9 h-9 rounded-xl text-[11px] font-black transition-all flex items-center justify-center shadow-md active:scale-90 border-none cursor-pointer"
                        title="خروج"
                    >
                        <i className="fas fa-power-off"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default App;
