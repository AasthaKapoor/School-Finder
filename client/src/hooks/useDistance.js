import { useMemo } from 'react'
import { haversine } from '../utils/haversine'

// Returns { urn: distanceMiles } for every school in the list
export function useDistance(userCoords, schools) {
  return useMemo(() => {
    if (!userCoords || !schools?.length) return {}
    return Object.fromEntries(
      schools
        .filter(s => s.lat != null && s.lng != null)
        .map(s => [s.urn, haversine([userCoords.lat, userCoords.lng], [s.lat, s.lng])])
    )
  }, [userCoords, schools])
}
