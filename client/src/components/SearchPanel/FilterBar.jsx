const PHASES  = ['All', 'Primary', 'Secondary']
const GENDERS = ['All', 'Mixed', 'Girls', 'Boys']
const SECTORS = ['All', 'State', 'Independent']
const RADII   = [1, 2, 3, 5]

function PillGroup({ label, options, value, onChange, renderLabel }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              value === opt
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {renderLabel ? renderLabel(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FilterBar({ filters, onChange, totalCount, filteredCount }) {
  function update(key, val) {
    onChange({ ...filters, [key]: val })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-5">
        <PillGroup
          label="Phase"
          options={PHASES}
          value={filters.phase}
          onChange={v => update('phase', v)}
        />

        <PillGroup
          label="Sector"
          options={SECTORS}
          value={filters.sector}
          onChange={v => update('sector', v)}
        />

        <PillGroup
          label="Gender"
          options={GENDERS}
          value={filters.gender}
          onChange={v => update('gender', v)}
        />

        <PillGroup
          label="Radius"
          options={RADII}
          value={filters.radius}
          onChange={v => update('radius', v)}
          renderLabel={r => `${r} mi`}
        />

        <div className="flex flex-col gap-1.5 ml-auto">
          <span className="text-xs font-medium text-gray-500">Sort</span>
          <select
            value={filters.sort}
            onChange={e => update('sort', e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="distance">Nearest first</option>
            <option value="ofsted">Ofsted rating</option>
            <option value="name">A–Z</option>
          </select>
        </div>
      </div>

      {totalCount > 0 && (
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
          {filteredCount === totalCount
            ? `${totalCount} school${totalCount !== 1 ? 's' : ''} found`
            : `${filteredCount} of ${totalCount} schools shown`}
        </p>
      )}
    </div>
  )
}
