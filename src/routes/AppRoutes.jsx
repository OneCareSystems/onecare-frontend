import React from 'react'
import { Route, Routes } from 'react-router-dom'
import LoginPage from '../pages/public/LoginPage'
import AdminLayout from '../layouts/AdminLayout'
import DoctorLayout from '../layouts/DoctorLayout'
import PharmacistLayout from '../layouts/PharmacistLayout'
import SuperAdminLayout from '../layouts/SuperAdminLayout'
import PublicLayout from '../layouts/PublicLayout'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import SuperAdminDashboardPage from '../pages/superAdmin/SuperAdminDashboardPage'
import PharmacistDashboardPage from '../pages/pharmacist/PharmacistDashboardPage'
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage'
import HomePage from '../pages/public/HomePage'

const AppRoutes = () => {
    return (
        <Routes>

            <Route element={<PublicLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/home" element={<HomePage />} />
            </Route>


            {/* ADMIN AREA */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route path='dashboard' element={<AdminDashboardPage />} />

            </Route>

            {/* DOCTOR AREA */}
            <Route path="/doctor" element={<DoctorLayout />}>
                <Route path='dashboard' element={<DoctorDashboardPage />} />
            </Route>

            {/* PHARMACIST AREA */}
            <Route path="/pharmacist" element={<PharmacistLayout />}>
                <Route path='dashboard' element={<PharmacistDashboardPage />} />
            </Route>

            {/* SUPER ADMIN AREA */}
            <Route path="/superadmin" element={<SuperAdminLayout />}>
                <Route path='dashboard' element={<SuperAdminDashboardPage />} />
            </Route>

        </Routes>
    )
}

export default AppRoutes
