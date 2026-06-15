export function parseOfstedGrade(raw) {
  const grades = { 1: 'Outstanding', 2: 'Good', 3: 'Requires improvement', 4: 'Inadequate' }
  const n = parseInt(raw, 10)
  return { numeric: n, label: grades[n] ?? 'Unknown' }
}

// Text colour classes (for large grade headings)
export function ofstedColour(grade) {
  switch (grade) {
    case 1: return 'text-teal-700'
    case 2: return 'text-green-700'
    case 3: return 'text-amber-700'
    case 4: return 'text-red-700'
    default: return 'text-gray-500'
  }
}

// Background + text colour classes (for pill badges)
export function ofstedBgColour(grade) {
  switch (grade) {
    case 1: return 'bg-teal-50 text-teal-700'
    case 2: return 'bg-green-50 text-green-700'
    case 3: return 'bg-amber-50 text-amber-700'
    case 4: return 'bg-red-50 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}
