import { useState } from 'react'
import SearchPanel from '../components/SearchPanel/SearchPanel'
import FilterBar from '../components/SearchPanel/FilterBar'
import SchoolCard from '../components/SchoolCard/SchoolCard'
import { useSchools } from '../hooks/useSchools'
import { useFilteredSchools } from '../hooks/useFilteredSchools'

const DEFAULT_FILTERS = { phase: 'All', sector: 'All', gender: 'All', radius: 3, sort: 'distance' }

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 h-4 w-3/4 rounded bg-gray-200" />
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-200" />
        <div className="h-5 w-24 rounded-full bg-gray-200" />
      </div>
      <div className="h-3 w-1/2 rounded bg-gray-200" />
    </div>
  )
}

export default function Home() {
  const [location, setLocation] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const { schools, loading, error } = useSchools(location, filters.radius)
  const filtered = useFilteredSchools(schools, filters)

  function handleLocation(loc) {
    setLocation(loc)
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">School Finder</h1>
        <p className="mb-8 text-gray-500">
          Enter a location or postcode to find and compare nearby schools.
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SearchPanel onLocation={handleLocation} />
        </div>

        {location && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              Showing schools near <strong>{location.label}</strong>
            </span>
          </div>
        )}

        {location && !loading && !error && (
          <div className="mt-4">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              totalCount={schools.length}
              filteredCount={filtered.length}
            />
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load schools: {error}. Make sure the server is running on port 3001.
          </div>
        )}

        {loading && (
          <div className="mt-4 flex flex-col gap-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && location && filtered.length === 0 && !error && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
            No schools match these filters within {filters.radius} mile{filters.radius !== 1 ? 's' : ''} of {location.label}.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {filtered.map(school => (
              <SchoolCard
                key={school.urn}
                school={school}
                distanceMiles={school.distanceMiles}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
