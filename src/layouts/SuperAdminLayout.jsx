import React from 'react'
import { Outlet } from 'react-router-dom'

const SuperAdminLayout = () => {
  return (
    <div>
      <Outlet />
    </div>
  )
}

export default SuperAdminLayout
