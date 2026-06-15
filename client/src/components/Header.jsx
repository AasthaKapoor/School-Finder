import { Link } from 'react-router-dom'
import { useShortlist } from '../context/ShortlistContext'

export default function Header() {
  const { schools } = useShortlist()
  const count = schools.length

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-base font-semibold text-gray-900 hover:text-indigo-600">
          School Finder
        </Link>

        <Link
          to="/shortlist"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <svg className="h-4 w-4" fill={count > 0 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Shortlist
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
