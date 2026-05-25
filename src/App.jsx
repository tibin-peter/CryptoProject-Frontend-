import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import KycPage from './pages/kyc/KycPage'
import MarketPage from './pages/market/MarketPage'
import TradePage from './pages/trade/TradePage'
import WalletPage from './pages/wallet/WalletPage'
import ECardPage from './pages/ecard/ECardPage'
import StakingPage from './pages/staking/StakingPage'
import LeaderboardPage from './pages/leaderboard/LeaderboardPage'
import ReportsPage from './pages/reports/ReportsPage'
import HomePage from './pages/home/HomePage'
import ServiceDetailPage from './pages/services/ServiceDetailPage'
import ProfilePage from './pages/profile/ProfilePage'

// New Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminKyc from './pages/admin/AdminKyc'
import AdminWallets from './pages/admin/AdminWallets'
import AdminAssets from './pages/admin/AdminAssets'
import AdminTrades from './pages/admin/AdminTrades'
import AdminRBAC from './pages/admin/AdminRBAC'
import AdminConfig from './pages/admin/AdminConfig'


function AuthGuard({ children }) {
    const token = useAuthStore((s) => s.token)
    const user = useAuthStore((s) => s.user)
    const location = useLocation()

    if (!token) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />
    }

    // Support flexible capitalization, string 'verified'/'approved'/'ok', and boolean true values
    const kycStatus = String(user?.kyc_status || user?.KYCStatus || '').toLowerCase()
    const isVerified = kycStatus === 'verified' || kycStatus === 'approved' || kycStatus === 'ok' || kycStatus === 'true' || user?.kyc_status === true || user?.KYCStatus === true
    const isKycOrProfileRoute = location.pathname === '/kyc' || location.pathname === '/profile'

    if (!isVerified && !isKycOrProfileRoute) {
        // Render the KycPage inline inside the active container/path, displaying either onboarding or pending/rejected status inline!
        return <KycPage />
    }

    return children
}

function AdminGuard({ children }) {
    const user = useAuthStore((s) => s.user)
    return user?.role === 'admin' ? children : <Navigate to="/market" replace />
}

export default function App() {
    const theme = useAuthStore((s) => s.theme)
    const token = useAuthStore((s) => s.token)

    useEffect(() => {
        if (theme === 'light') {
            document.body.classList.add('theme-light')
        } else {
            document.body.classList.remove('theme-light')
        }
    }, [theme])

    useEffect(() => {
        if (token) {
            // Background update of profile details to capture any admin status changes on load/navigation
            import('./services/api').then(({ profileAPI }) => {
                profileAPI.getProfile().then(res => {
                    if (res.success && res.data) {
                        const backendUser = res.data
                        const currentStore = useAuthStore.getState()
                        const existingUser = currentStore.user || {}
                        
                        // Parse status cleanly: can be boolean or string
                        let mappedKycStatus = 'not_submitted'
                        const rawStatus = backendUser.KYCStatus || backendUser.kyc_status
                        if (rawStatus === true) {
                            mappedKycStatus = 'verified'
                        } else if (typeof rawStatus === 'string') {
                            mappedKycStatus = rawStatus
                        } else if (existingUser.kyc_status) {
                            mappedKycStatus = existingUser.kyc_status
                        }

                        currentStore.updateUser({
                            ...existingUser,
                            ...backendUser,
                            id: backendUser.ID || backendUser.id || existingUser.id,
                            full_name: backendUser.Name || backendUser.full_name || existingUser.full_name || 'User',
                            email: backendUser.Email || backendUser.email || existingUser.email,
                            role: (backendUser.Role || backendUser.role || existingUser.role || 'user').toLowerCase(),
                            kyc_status: mappedKycStatus
                        })
                    }
                }).catch(err => console.error('Failed background sync of user profile status:', err))
            })
        }
    }, [token])

    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Toaster
                position="top-right"
                toastOptions={{
                    className: 'bg-brand-panel text-white border border-brand-border text-sm font-mono',
                    style: { background: '#111111', color: '#fff', borderColor: '#222222' }
                }}
            />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/service/:id" element={<ServiceDetailPage />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
                <Route path="/auth/forgot" element={<ForgotPasswordPage />} />

                <Route element={<AppLayout />}>
                    {/* Publicly accessible within AppLayout */}
                    <Route path="/trade/:symbol" element={<TradePage />} />

                    {/* Protected Routes */}
                    <Route path="/market" element={<AuthGuard><MarketPage /></AuthGuard>} />
                    <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
                    <Route path="/kyc" element={<AuthGuard><KycPage /></AuthGuard>} />
                    <Route path="/wallet" element={<Navigate to="/wallet/cash" replace />} />
                    <Route path="/wallet/:tab" element={<AuthGuard><WalletPage /></AuthGuard>} />
                    <Route path="/ecard" element={<AuthGuard><ECardPage /></AuthGuard>} />
                    <Route path="/staking" element={<AuthGuard><StakingPage /></AuthGuard>} />
                    <Route path="/leaderboard" element={<AuthGuard><LeaderboardPage /></AuthGuard>} />
                    <Route path="/reports" element={<AuthGuard><ReportsPage /></AuthGuard>} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                    <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
                    <Route path="/admin/kyc" element={<AdminGuard><AdminKyc /></AdminGuard>} />
                    <Route path="/admin/wallets" element={<AdminGuard><AdminWallets /></AdminGuard>} />
                    <Route path="/admin/assets" element={<AdminGuard><AdminAssets /></AdminGuard>} />
                    <Route path="/admin/trades" element={<AdminGuard><AdminTrades /></AdminGuard>} />
                    <Route path="/admin/rbac" element={<AdminGuard><AdminRBAC /></AdminGuard>} />
                    <Route path="/admin/config" element={<AdminGuard><AdminConfig /></AdminGuard>} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
