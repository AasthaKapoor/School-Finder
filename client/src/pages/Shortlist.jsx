import { Link } from 'react-router-dom'
import { useShortlist } from '../context/ShortlistContext'
import SchoolCard from '../components/SchoolCard/SchoolCard'

export default function Shortlist() {
  const { schools, clear } = useShortlist()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Shortlist</h1>
            {schools.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {schools.length} school{schools.length !== 1 ? 's' : ''} saved
              </p>
            )}
          </div>
          {schools.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Clear all
            </button>
          )}
        </div>

        {schools.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-16 text-center">
            <svg className="mx-auto mb-4 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No schools saved yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Search for schools and click the bookmark icon to save them here.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Find schools
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {schools.map(school => (
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
