import { useState } from 'react'
import styles from './Calendar.module.css'
import UserAutocomplete from './UserAutocomplete'

export default function Calendar({ user, events, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  // viewMode: 'create' | 'view'
  const [viewMode, setViewMode] = useState('create')
  const [selectedEvent, setSelectedEvent] = useState(null)

  const [formData, setFormData] = useState({ title: '', start_time: '', end_time: '', participants: [], anonymous: 0, description: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    })
  }

  const handleParticipantsChange = (participants) => {
    setFormData({ ...formData, participants })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')

    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      setError('❌ La hora de fin debe ser posterior a la de inicio')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.title,
          start_time: formData.start_time,
          end_time: formData.end_time,
          participants: formData.participants, // Now sends array of objects
          anonymous: formData.anonymous,
          description: formData.description
        })
      })

      const data = await res.json()
      if (!res.ok) {
        // Backend returns 409 for conflicts
        if (res.status === 409) {
          setError('❌ conflicto de horario: Ya existe un evento en ese horario para uno de los participantes.')
        } else {
          setError(data.error || 'Error al crear evento')
        }
        return
      }

      setShowForm(false)
      setFormData({ title: '', start_time: '', end_time: '', participants: [], anonymous: 0, description: '' })
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const calendarDays = Array.from({ length: firstDay }, () => null).concat(days)

  const getEventsForDate = (day) => {
    if (!day) return []
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.start_time.startsWith(dateStr))
  }

  const openCreateModal = (day) => {
    setViewMode('create')
    setSelectedDate(day)
    setError('')
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setFormData({
      title: '',
      start_time: `${dateStr}T09:00`,
      end_time: `${dateStr}T10:00`,
      participants: [],
      anonymous: 0,
      description: ''
    })
    setShowForm(true)
  }

  const openViewModal = (event, e) => {
    e.stopPropagation()
    setViewMode('view')
    setSelectedEvent(event)
    setError('')
    setShowForm(true)
  }

  const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
  }

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <button className={styles.createBtn} onClick={() => openCreateModal(new Date().getDate())}>
          <span className={styles.createIcon}>+</span>
          <span>Crear</span>
        </button>
        {/* Future: Mini calendar or filter list can go here */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, color: '#5f6368', marginBottom: 10 }}>Mis Calendarios</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked readOnly style={{ accentColor: '#1a73e8' }} />
            <span>{user.name}</span>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.navControls}>
            <h2 className={styles.monthTitle}>
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <div>
              <button className={styles.navBtn} onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>❮</button>
              <button className={styles.navBtn} onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>❯</button>
              <button className={styles.navBtn} onClick={() => setCurrentMonth(new Date())}>Hoy</button>
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.weekHeader}>
            {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map(day => (
              <div key={day} className={styles.dayLabel}>{day}</div>
            ))}
          </div>
          <div className={styles.monthView}>
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`${styles.dayCell} ${!day ? styles.empty : ''} ${day && isToday(day) ? styles.today : ''}`}
                onClick={() => day && openCreateModal(day)}
              >
                {day && (
                  <>
                    <span className={styles.dayNumber}>{day}</span>
                    <div className={styles.dayEvents}>
                      {getEventsForDate(day).map(e => (
                        <div
                          key={e.id}
                          className={`${styles.eventPill} ${e.anonymous ? styles.anonymous : ''}`}
                          title={e.anonymous ? 'Evento privado' : e.title}
                          onClick={(ev) => openViewModal(e, ev)}
                        >
                          {e.anonymous ? '🔒 Privado' : e.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className={styles.modalContent}>
              {viewMode === 'create' ? (
                <>
                  <h2 className={styles.modalTitle}>Nuevo evento</h2>
                  {error && <div style={{ color: '#d93025', background: '#fce8e6', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
                  <form onSubmit={handleCreate}>
                    <div className={styles.formGroup}>
                      <input
                        className={styles.input}
                        type="text"
                        name="title"
                        placeholder="Añade un título"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        autoFocus
                      />
                    </div>

                    <div className={styles.formGroup} style={{ display: 'flex', gap: 16 }}>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        required
                      />
                      <span style={{ alignSelf: 'center' }}>-</span>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label style={{ display: 'block', fontSize: 12, color: '#5f6368', marginBottom: 4 }}>Invitados</label>
                      <UserAutocomplete
                        selectedParticipants={formData.participants}
                        onChange={handleParticipantsChange}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <textarea
                        className={styles.input}
                        name="description"
                        placeholder="Descripción"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>

                    <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        name="anonymous"
                        checked={formData.anonymous}
                        onChange={handleInputChange}
                        id="anonCheck"
                      />
                      <label htmlFor="anonCheck" style={{ fontSize: 14 }}>Evento privado (solo visible para participantes)</label>
                    </div>

                    <div className={styles.modalActions}>
                      <button type="submit" className={styles.saveBtn} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                  </form>
                </>
              ) : (
                <div style={{ padding: '0 10px 10px' }}>
                  <h2 style={{ fontSize: '22px', color: '#3c4043', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '18px', height: '18px', background: '#1a73e8', borderRadius: '4px', display: 'inline-block' }}></span>
                    {selectedEvent.title}
                    {selectedEvent.anonymous ? <span style={{ fontSize: '0.8em' }}>🔒</span> : null}
                  </h2>

                  <div style={{ marginBottom: '16px', color: '#5f6368', fontSize: '14px', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: '500', color: '#3c4043' }}>
                      {formatDateTime(selectedEvent.start_time)}
                      <br />
                      a
                      <br />
                      {formatDateTime(selectedEvent.end_time)}
                    </div>
                  </div>

                  {selectedEvent.description && (
                    <div style={{ marginBottom: '16px', color: '#3c4043', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                      {selectedEvent.description}
                    </div>
                  )}

                  <div style={{ marginBottom: '16px', color: '#5f6368', fontSize: '14px' }}>
                    <strong>Visibilidad:</strong> {selectedEvent.anonymous ? 'Privado' : 'Público'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button onClick={() => setShowForm(false)} className={styles.closeBtn} style={{ position: 'static', padding: '8px 16px', background: '#f1f3f4', borderRadius: '4px' }}>Cerrar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div >
      )
      }
    </div >
  )
}
