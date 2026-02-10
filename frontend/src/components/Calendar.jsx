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

  const [isExtended, setIsExtended] = useState(false)

  // ... (keep existing handleCreate, etc.)

  const openCreateModal = (day) => {
    setViewMode('create')
    setIsExtended(false) // Default to quick view
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

  // Icons
  const Icons = {
    Clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    MapPin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    AlignLeft: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>,
    Repeat: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>,
    Bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.miniCalendar}>
          {/* Placeholder for mini calendar - just showing current month name for now */}
          <div style={{ fontWeight: '600', marginBottom: 10 }}>{currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</div>
          {/* Simple grid representation could go here */}
        </div>

        <button className={styles.createBtn} onClick={() => openCreateModal(new Date().getDate())}>
          Agregar calendario
        </button>

        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8, cursor: 'pointer' }}>
            <span style={{ transform: 'rotate(90deg)', fontSize: 12 }}>❯</span>
            <span style={{ fontWeight: 600 }}>{user.email}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, paddingLeft: 16 }}>
            <input type="checkbox" checked readOnly style={{ accentColor: '#0f6cbd' }} />
            <span>Calendario</span>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 className={styles.monthTitle}>
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center' }}>
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
          <div className={`${styles.modal} ${isExtended ? styles.extended : ''}`} onClick={e => e.stopPropagation()}>

            {viewMode === 'create' ? (
              <>
                <div className={styles.quickHeader}>
                  <button type="submit" className={styles.btnPrimary} onClick={handleCreate}>Guardar</button>
                  <button type="button" className={styles.linkBtn} style={{ color: '#201f1e' }} onClick={() => setShowForm(false)}>Descartar</button>
                  <button className={styles.closeBtn} onClick={() => setShowForm(false)} style={{ marginLeft: 'auto' }}>✕</button>
                </div>

                <div className={styles.modalBody}>
                  {error && <div style={{ color: '#d93025', background: '#fce8e6', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}

                  <div style={{ marginBottom: 16 }}>
                    <input
                      className={styles.modalTitleInput}
                      type="text"
                      name="title"
                      placeholder="Agregar un título"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      autoFocus
                    />
                  </div>

                  <div className={styles.row}>
                    <div className={styles.iconLabel}>{Icons.Clock}</div>
                    <div className={styles.inputGroup} style={{ flexDirection: isExtended ? 'row' : 'column' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className={styles.input} type="date" value={formData.start_time.split('T')[0]} onChange={(e) => setFormData({ ...formData, start_time: `${e.target.value}T${formData.start_time.split('T')[1]}` })} />
                        <input className={styles.input} type="time" value={formData.start_time.split('T')[1]} onChange={(e) => setFormData({ ...formData, start_time: `${formData.start_time.split('T')[0]}T${e.target.value}` })} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className={styles.input} type="date" value={formData.end_time.split('T')[0]} onChange={(e) => setFormData({ ...formData, end_time: `${e.target.value}T${formData.end_time.split('T')[1]}` })} />
                        <input className={styles.input} type="time" value={formData.end_time.split('T')[1]} onChange={(e) => setFormData({ ...formData, end_time: `${formData.end_time.split('T')[0]}T${e.target.value}` })} />
                      </div>
                    </div>
                  </div>

                  {!isExtended && (
                    <>
                      <div className={styles.row}>
                        <div className={styles.iconLabel}>{Icons.Repeat}</div>
                        <div className={styles.inputGroup}>
                          <button type="button" className={styles.btnSecondary} style={{ width: '100%', textAlign: 'left' }}>No repetir</button>
                        </div>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.iconLabel}>{Icons.Bell}</div>
                        <div className={styles.inputGroup}>
                          <button type="button" className={styles.btnSecondary} style={{ width: '100%', textAlign: 'left' }}>15 minutos antes</button>
                        </div>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.iconLabel}>{Icons.MapPin}</div>
                        <div className={styles.inputGroup}>
                          <input className={styles.input} type="text" placeholder="Buscar una ubicación" />
                        </div>
                      </div>
                    </>
                  )}

                  <div className={styles.row}>
                    <div className={styles.iconLabel}>{!isExtended && Icons.AlignLeft}</div>
                    <div className={styles.inputGroup}>
                      {isExtended ? (
                        <div style={{ width: '100%' }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Descripción</label>
                          <textarea
                            className={styles.input}
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={6}
                          />
                        </div>
                      ) : (
                        <input
                          className={styles.input}
                          name="description"
                          placeholder="Agregar una descripción"
                          value={formData.description}
                          onChange={handleInputChange}
                        />
                      )}
                    </div>
                  </div>

                  {isExtended && (
                    <div className={styles.row}>
                      <div className={styles.iconLabel}></div>
                      <div className={styles.inputGroup} style={{ display: 'block' }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Invitados</label>
                        <UserAutocomplete
                          selectedParticipants={formData.participants}
                          onChange={handleParticipantsChange}
                        />
                      </div>
                    </div>
                  )}

                  <div className={styles.row}>
                    <div className={styles.iconLabel}></div>
                    <div className={styles.inputGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          name="anonymous"
                          checked={formData.anonymous}
                          onChange={handleInputChange}
                        />
                        Evento privado
                      </label>
                    </div>
                  </div>

                </div>

                {!isExtended && (
                  <div className={styles.footer}>
                    <button type="button" className={styles.btnSecondary} onClick={() => setIsExtended(true)}>Más opciones</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '0 10px 10px' }}>
                <div className={styles.quickHeader} style={{ background: 'white', border: 'none' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: '18px', height: '18px', background: '#0f6cbd', borderRadius: '4px', display: 'inline-block' }}></span>
                    <h2 style={{ fontSize: '20px', color: '#252423', margin: 0, fontWeight: 600 }}>
                      {selectedEvent.title}
                      {selectedEvent.anonymous ? <span style={{ fontSize: '0.8em', marginLeft: 8 }}>🔒</span> : null}
                    </h2>
                  </div>
                  <button className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
                </div>

                <div style={{ padding: '0 16px 16px 42px', color: '#605e5c', fontSize: '14px', lineHeight: '1.5' }}>
                  <div style={{ fontWeight: '600', color: '#252423', marginBottom: 12 }}>
                    {formatDateTime(selectedEvent.start_time)} <br /> hasta <br /> {formatDateTime(selectedEvent.end_time)}
                  </div>

                  {selectedEvent.description && (
                    <div style={{ marginBottom: '16px', color: '#252423', whiteSpace: 'pre-wrap' }}>
                      {selectedEvent.description}
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <strong>Visibilidad:</strong> {selectedEvent.anonymous ? 'Privado' : 'Público'}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
