import { useState, useEffect } from 'react'
import styles from './App.module.css'
import Login from './components/Login'
import Calendar from './components/Calendar'
import Invites from './components/Invites'
import Admin from './components/Admin'

export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('calendar') // calendar, invites, admin
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
      fetchEvents(token)
    }
  }, [])

  const fetchEvents = async (token) => {
    try {
      setLoading(true)
      const res = await fetch('/api/events', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setEvents(data)
      } else {
        console.error('API Error:', data)
        setEvents([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (loginUser) => {
    setUser(loginUser)
    setTab('calendar')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setEvents([])
    setTab('calendar')
  }

  const handleRefresh = async () => {
    const token = localStorage.getItem('token')
    if (token) await fetchEvents(token)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📅 Agenda Colaborativa</h1>
        <div className={styles.userInfo}>
          <span>{user.name} ({user.role})</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      <nav className={styles.nav}>
        <button className={tab === 'calendar' ? styles.active : ''} onClick={() => setTab('calendar')}>
          Calendario
        </button>
        <button className={tab === 'invites' ? styles.active : ''} onClick={() => setTab('invites')}>
          Mis invitaciones
        </button>
        {user.role === 'admin' && (
          <button className={tab === 'admin' ? styles.active : ''} onClick={() => setTab('admin')}>
            Admin
          </button>
        )}
      </nav>

      <main className={styles.main}>
        {loading && <p>Cargando...</p>}
        {tab === 'calendar' && <Calendar user={user} events={events} onRefresh={handleRefresh} />}
        {tab === 'invites' && <Invites user={user} onRefresh={handleRefresh} />}
        {tab === 'admin' && user.role === 'admin' && <Admin user={user} onRefresh={handleRefresh} />}
      </main>
    </div>
  )
}
