import { useState, useEffect, useRef } from 'react'

export default function UserAutocomplete({ selectedParticipants = [], onChange }) {
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState([])
    const [loading, setLoading] = useState(false)

    const searchTimeout = useRef(null)

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([])
            return
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current)

        searchTimeout.current = setTimeout(async () => {
            setLoading(true)
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    // Filter out already selected
                    // We compare by ID (if type is user/guest) or email (if type is new)
                    const filtered = data.filter(u => !selectedParticipants.some(p =>
                        (p.id && p.id === u.id) || (p.email && p.email === u.email)
                    ))
                    setSuggestions(filtered)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }, 300)
    }, [query, selectedParticipants])

    const handleSelect = (user) => {
        const newParticipants = [...selectedParticipants, user]
        onChange(newParticipants)
        setQuery('')
        setSuggestions([])
    }

    const handleRemove = (index) => {
        const newParticipants = selectedParticipants.filter((_, i) => i !== index)
        onChange(newParticipants)
    }

    const isValidEmail = (email) => {
        // Relaxed check to allow partial emails or just strings if the user really wants
        // But to be helpful, we'll just check length for the prompt, and maybe warn or just allow it.
        // User asked for "at least 3 characters show suggestions".
        return email.length >= 3
    }

    const showAddExternal = query.length >= 3 && !suggestions.some(s => s.email === query) && !selectedParticipants.some(p => p.email === query)

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
                {selectedParticipants.map((u, idx) => (
                    <span key={idx} style={{
                        background: '#e8f0fe',
                        borderRadius: '16px',
                        padding: '2px 8px',
                        fontSize: '0.9rem',
                        color: '#1967d2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {u.name} &lt;{u.email}&gt;
                        <button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1967d2', fontSize: '1.2rem', lineHeight: 1 }}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>

            <input
                type="text"
                placeholder="Buscar usuarios o escribir correo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />

            {(suggestions.length > 0 || showAddExternal) && (
                <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                }}>
                    {suggestions.map(u => (
                        <li
                            key={u.id}
                            onClick={() => handleSelect(u)}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                            onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{u.email} ({u.type === 'guest' ? 'Externo' : 'Usuario'})</div>
                        </li>
                    ))}
                    {showAddExternal && (
                        <li
                            onClick={() => handleSelect({ type: 'new', email: query, name: query })}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', color: '#1a73e8' }}
                            onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            <div style={{ fontWeight: 'bold' }}>Invitar a {query}</div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>Nuevo invitado externo</div>
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}
