import React, { useEffect } from 'react'
import Login from './pages/Login'
import AppLayout from './layout/AppLayout'
import { useAuth } from './store/auth'
import { getMe } from './services/auth'
import { SocketProvider } from './socket'

const App = () => {
  const { setUser, user, clearUser } = useAuth()

  useEffect(() => {
    getMe()
      .then((response) => {
        setUser(response.data.user)
      })
      .catch(() => {
        clearUser()
      })
  }, [])

  return user ? <SocketProvider>
    <AppLayout />
  </SocketProvider>
    : <Login />
}

export default App
