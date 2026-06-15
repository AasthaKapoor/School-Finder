import { useMemo } from 'react'

function isIndependent(school) {
  return school.type?.toLowerCase().includes('independent') ?? false
}

export function useFilteredSchools(schools, filters) {
  return useMemo(() => {
    let result = [...schools]

    if (filters.phase !== 'All') {
      result = result.filter(s => s.phase === filters.phase)
    }

    if (filters.sector === 'State') {
      result = result.filter(s => !isIndependent(s))
    } else if (filters.sector === 'Independent') {
      result = result.filter(s => isIndependent(s))
    }

    if (filters.gender !== 'All') {
      result = result.filter(s => s.gender === filters.gender)
    }

    if (filters.sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (filters.sort === 'ofsted') {
      // Grade 1 (Outstanding) first; schools with no data go to the end
      result.sort((a, b) => {
        const ga = a.ofsted?.grade ?? 99
        const gb = b.ofsted?.grade ?? 99
        return ga - gb
      })
    }
    // 'distance' order comes from the server already

    return result
  }, [schools, filters])
}
