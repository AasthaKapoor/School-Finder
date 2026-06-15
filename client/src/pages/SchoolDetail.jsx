import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import MapView from '../components/MapView/MapView'
import { useShortlist } from '../context/ShortlistContext'
import { ofstedBgColour } from '../utils/ofstedParser'

const API_BASE = 'http://localhost:3001'

const OFSTED_LABELS = { 1: 'Outstanding', 2: 'Good', 3: 'Requires improvement', 4: 'Inadequate' }

const PHASE_COLOURS = {
  Primary:      'bg-emerald-50 text-emerald-700',
  Secondary:    'bg-blue-50 text-blue-700',
  'All-through':'bg-purple-50 text-purple-700',
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  )
}

export default function SchoolDetail() {
  const { urn } = useParams()
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { toggle, has } = useShortlist()

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/schools/${urn}`)
      .then(r => {
        if (r.status === 404) throw new Error('School not found')
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(setSchool)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [urn])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl animate-pulse px-4 py-12">
          <div className="mb-6 h-4 w-24 rounded bg-gray-200" />
          <div className="mb-4 h-8 w-3/4 rounded bg-gray-200" />
          <div className="mb-6 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-6 w-28 rounded-full bg-gray-200" />
          </div>
          <div className="h-56 rounded-xl bg-gray-200" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            ← Back to search
          </Link>
          <div className="rounded-lg bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            {error}
          </div>
        </div>
      </main>
    )
  }

  const saved = has(school.urn)
  const phaseColour = PHASE_COLOURS[school.phase] ?? 'bg-gray-100 text-gray-600'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          ← Back to search
        </Link>

        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{school.name}</h1>
          <button
            type="button"
            onClick={() => toggle(school)}
            className={`mt-1 shrink-0 rounded-full p-2 transition-colors ${
              saved
                ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            <svg className="h-5 w-5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${phaseColour}`}>
            {school.phase}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {school.type}
          </span>
          {school.gender && school.gender !== 'Mixed' && (
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
              {school.gender}
            </span>
          )}
        </div>

        {school.lat && school.lng && (
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <MapView lat={school.lat} lng={school.lng} label={school.name} />
          </div>
        )}

        {school.ofsted && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Ofsted</h2>
            </div>
            <div className="px-5">
              <div className="flex flex-wrap items-center gap-3 py-4">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ofstedBgColour(school.ofsted.grade)}`}>
                  {school.ofsted.label}
                </span>
                {school.ofsted.date && (
                  <span className="text-sm text-gray-500">
                    Inspected{' '}
                    {new Date(school.ofsted.date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {school.ofsted.qualityOfEducation && (
                  <InfoRow label="Quality of education" value={OFSTED_LABELS[school.ofsted.qualityOfEducation]} />
                )}
                {school.ofsted.leadershipAndManagement && (
                  <InfoRow label="Leadership & management" value={OFSTED_LABELS[school.ofsted.leadershipAndManagement]} />
                )}
                {school.ofsted.behaviourAndAttitudes && (
                  <InfoRow label="Behaviour & attitudes" value={OFSTED_LABELS[school.ofsted.behaviourAndAttitudes]} />
                )}
                {school.ofsted.personalDevelopment && (
                  <InfoRow label="Personal development" value={OFSTED_LABELS[school.ofsted.personalDevelopment]} />
                )}
                {school.ofsted.earlyYearsProvision && (
                  <InfoRow label="Early years provision" value={OFSTED_LABELS[school.ofsted.earlyYearsProvision]} />
                )}
                {school.ofsted.sixthFormProvision && (
                  <InfoRow label="Sixth form provision" value={OFSTED_LABELS[school.ofsted.sixthFormProvision]} />
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="divide-y divide-gray-100 px-5">
            <InfoRow label="Address" value={`${school.address}, ${school.postcode}`} />
            <InfoRow label="Local authority" value={school.localAuthority} />
            <InfoRow label="Phase" value={school.phase} />
            <InfoRow label="Type" value={school.type} />
            <InfoRow label="Gender" value={school.gender} />
            {school.website && (
              <div className="flex justify-between gap-4 py-2.5 text-sm">
                <span className="text-gray-500">Website</span>
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:underline"
                >
                  Visit website
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.name + ' ' + school.postcode)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Google Maps
          </a>
        </div>
      </div>
    </main>
  )
}
