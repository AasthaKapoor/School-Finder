import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:3001'

export function useSchools(location, radius = 3) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!location) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(
      `${API_BASE}/api/schools?lat=${location.lat}&lng=${location.lng}&radius=${radius}`,
      { signal: controller.signal }
    )
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(data => setSchools(data))
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [location, radius])

  return { schools, loading, error }
}
