import { useState } from 'react'

const POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/i

async function geocodePostcode(raw) {
  const postcode = raw.replace(/\s+/g, '').toUpperCase()
  const res = await fetch(`https://api.postcodes.io/postcodes/${postcode}`)
  if (!res.ok) throw new Error('Postcode not found')
  const { result } = await res.json()
  return {
    lat: result.latitude,
    lng: result.longitude,
    label: result.postcode,
    district: result.admin_district ?? result.parliamentary_constituency ?? postcode,
    postcode: result.postcode,
  }
}

async function geocodeLocationName(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', UK')}&countrycodes=gb&format=json&limit=1&addressdetails=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error('Geocoding service unavailable')
  const results = await res.json()
  if (!results.length) throw new Error('Location not found')
  const r = results[0]
  const addr = r.address ?? {}
  const district = addr.town ?? addr.city ?? addr.suburb ?? addr.county ?? query
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    label: district,
    district,
    postcode: addr.postcode ?? null,
  }
}

export default function SearchPanel({ onLocation }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = input.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      const location = POSTCODE_RE.test(trimmed)
        ? await geocodePostcode(trimmed)
        : await geocodeLocationName(trimmed)
      onLocation(location)
    } catch (err) {
      setError(
        err.message === 'Location not found'
          ? 'Location not found — try a different name or use a postcode'
          : 'Could not find this location — please try again'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="location" className="text-sm font-medium text-gray-700">
        Location or postcode
      </label>
      <div className="flex gap-2">
        <input
          id="location"
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          placeholder="e.g. Orpington or SW1A 2AA"
          autoComplete="off"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Looking up…' : 'Search'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </form>
  )
}
