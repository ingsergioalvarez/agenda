import { useState, useEffect } from 'react'
import styles from './Invites.module.css'

export default function Invites({ user, onRefresh }) {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/invites', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar invitaciones')
      }
      setInvites(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setInvites([])
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (inviteId, status) => {
    try {
      const res = await fetch(`/api/invites/${inviteId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      })

      if (!res.ok) {
        setError('Error al responder invitación')
        return
      }

      fetchInvites()
      onRefresh()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>Cargando invitaciones...</p>

  return (
    <div className={styles.container}>
      <h1>Mis invitaciones</h1>
      {error && <p className={styles.error}>{error}</p>}

      {invites.length === 0 ? (
        <p className={styles.empty}>No tienes invitaciones pendientes</p>
      ) : (
        <div className={styles.invitesList}>
          {invites.map(invite => (
            <div key={invite.id} className={styles.inviteCard}>
              <div className={styles.inviteBody}>
                {invite.anonymous ? (
                  <>
                    <div className={styles.iconLarge}>🔒</div>
                    <div className={styles.inviteInfo}>
                      <h3>{invite.note || 'Evento privado'}</h3>
                      <p>La información de este evento es privada</p>
                      <p className={styles.hint}>No puedes ver los detalles hasta que aceptes</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.iconLarge}>📅</div>
                    <div className={styles.inviteInfo}>
                      <h3>{invite.title}</h3>
                      <p className={styles.time}>
                        {new Date(invite.start_time).toLocaleString('es-ES')} - {new Date(invite.end_time).toLocaleTimeString('es-ES')}
                      </p>
                      {invite.description && <p>{invite.description}</p>}
                    </div>
                  </>
                )}
              </div>

              <div className={styles.actions}>
                {invite.status === 'pending' ? (
                  <>
                    <button
                      className={styles.acceptBtn}
                      onClick={() => handleResponse(invite.id, 'accepted')}
                    >
                      ✓ Aceptar
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleResponse(invite.id, 'rejected')}
                    >
                      ✕ Rechazar
                    </button>
                  </>
                ) : (
                  <span className={styles.status}>
                    {invite.status === 'accepted' ? '✓ Aceptada' : '✕ Rechazada'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
