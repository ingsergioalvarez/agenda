import { useState, useEffect } from 'react'
import styles from './Admin.module.css'

export default function Admin({ user, onRefresh }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar usuarios. Verifica que seas administrador.')
      }
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!res.ok) {
        setError('Error al cambiar rol')
        return
      }

      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStatusChange = async (userId, isActive) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: isActive })
      })
      if (!res.ok) {
        setError('Error al cambiar estado')
        return
      }
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al crear usuario')
        return
      }
      setShowCreateForm(false)
      setNewUser({ name: '', email: '', password: '', role: 'user' })
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading && users.length === 0) return <p>Cargando usuarios...</p>

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Panel de Administración</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: '#1a73e8', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500'
          }}
        >
          {showCreateForm ? 'Cancelar' : 'Crear Usuario'}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {showCreateForm && (
        <div className={styles.section} style={{ background: '#f8f9fa' }}>
          <h2>Nuevo Usuario</h2>
          <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Nombre</label>
              <input type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Email</label>
              <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Contraseña</label>
              <input type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Rol</label>
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}>
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button type="submit" style={{ background: '#0b8043', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
          </form>
        </div>
      )}

      <div className={styles.section}>
        <h2>Gestionar usuarios</h2>
        {users.length === 0 ? (
          <p>No hay usuarios</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader} style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}>
              <div>Usuario</div>
              <div>Email</div>
              <div>Rol</div>
              <div>Estado</div>
              <div>Acciones</div>
            </div>
            {users.map(u => (
              <div key={u.id} className={styles.tableRow} style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}>
                <div>{u.name || 'Sin nombre'}</div>
                <div>{u.email}</div>
                <div>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className={styles.select}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                    background: u.is_active ? '#e6f4ea' : '#fce8e6',
                    color: u.is_active ? '#137333' : '#c5221f'
                  }}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div>
                  {u.id === user.id ? (
                    <span className={styles.badge}>Tú</span>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      style={{ color: u.is_active ? '#d93025' : '#1a73e8' }}
                      onClick={() => handleStatusChange(u.id, !u.is_active)}
                    >
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>Estadísticas</h2>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{users.length}</div>
            <div className={styles.statLabel}>Usuarios registrados</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{users.filter(u => u.role === 'admin').length}</div>
            <div className={styles.statLabel}>Administradores</div>
          </div>
        </div>
      </div>
    </div>
  )
}
