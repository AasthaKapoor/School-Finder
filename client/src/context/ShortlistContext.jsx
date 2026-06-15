import { createContext, useContext, useState, useCallback } from 'react'

const ShortlistContext = createContext(null)

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('shortlist') || '[]')
  } catch {
    return []
  }
}

function saveToStorage(schools) {
  localStorage.setItem('shortlist', JSON.stringify(schools))
}

export function ShortlistProvider({ children }) {
  const [schools, setSchools] = useState(loadFromStorage)

  const toggle = useCallback((school) => {
    setSchools(prev => {
      const exists = prev.some(s => s.urn === school.urn)
      const next = exists
        ? prev.filter(s => s.urn !== school.urn)
        : [...prev, school]
      saveToStorage(next)
      return next
    })
  }, [])

  const has = useCallback(
    (urn) => schools.some(s => s.urn === urn),
    [schools]
  )

  const clear = useCallback(() => {
    setSchools([])
    localStorage.removeItem('shortlist')
  }, [])

  return (
    <ShortlistContext.Provider value={{ schools, toggle, has, clear }}>
      {children}
    </ShortlistContext.Provider>
  )
}

export function useShortlist() {
  const ctx = useContext(ShortlistContext)
  if (!ctx) throw new Error('useShortlist must be used inside ShortlistProvider')
  return ctx
}
