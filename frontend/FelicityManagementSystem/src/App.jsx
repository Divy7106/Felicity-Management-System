import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getUserData } from './services/user'
import { useState } from 'react'
import { useContext } from 'react'
import { UserContext } from './contexts/UserContexts'
import { Header } from './components'

function App() {

  const location = useLocation()
  const navigate = useNavigate()
  const { updateUserData } = useContext(UserContext)

  useEffect(() => {
    getUserData()
      .then((r) => {
        if (r.data.response) {
          updateUserData(r.data.response)
        }
      }).catch((err) => {
        if(location.pathname !== '/signup')
          navigate('/login')
      })
  }, [])

  if (location.pathname === '/login' || location.pathname === '/signup') {
    return (
      <div className="bg-stone-900 min-h-screen">
        <Outlet />
      </div>
    )
  } else {
    return (
        <div className="bg-stone-900 min-h-screen">
          <Header />
          <Outlet />
        </div>
    )
  }
}

export default App
