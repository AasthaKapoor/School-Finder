import { Link } from 'react-router-dom'
import DistanceBadge from '../DistanceBadge/DistanceBadge'
import { useShortlist } from '../../context/ShortlistContext'
import { ofstedBgColour } from '../../utils/ofstedParser'

const PHASE_COLOURS = {
  Primary:      'bg-emerald-50 text-emerald-700',
  Secondary:    'bg-blue-50 text-blue-700',
  'All-through':'bg-purple-50 text-purple-700',
}

const GENDER_LABEL = { Girls: 'Girls', Boys: 'Boys', Mixed: null }

export default function SchoolCard({ school, distanceMiles }) {
  const { toggle, has } = useShortlist()
  const saved = has(school.urn)
  const phaseColour = PHASE_COLOURS[school.phase] ?? 'bg-gray-100 text-gray-600'
  const genderLabel = GENDER_LABEL[school.gender]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/school/${school.urn}`}
          className="text-base font-semibold text-gray-900 hover:text-indigo-600 hover:underline leading-snug"
        >
          {school.name}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <DistanceBadge miles={distanceMiles} />
          <button
            type="button"
            onClick={() => toggle({ ...school, distanceMiles })}
            aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
            className={`rounded-full p-1.5 transition-colors ${
              saved
                ? 'text-indigo-600 hover:bg-indigo-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            <svg className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${phaseColour}`}>
          {school.phase}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {school.type}
        </span>
        {genderLabel && (
          <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700">
            {genderLabel}
          </span>
        )}
        {school.ofsted && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ofstedBgColour(school.ofsted.grade)}`}>
            {school.ofsted.label}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {school.address}, {school.postcode}
        {school.localAuthority ? ` · ${school.localAuthority}` : ''}
      </p>
    </div>
  )
}
