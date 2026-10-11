import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from '@agrijoin/shared';

/**
 * Device location with explicit consent via expo-location. Nothing happens
 * until request() is called. On denial we return null and callers fall back
 * to the textual location — never a fabricated position.
 */
export function useLocation() {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');

  const request = useCallback(async () => {
    setStatus('loading');
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      setStatus('denied');
      return null;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      setStatus('granted');
      return c;
    } catch {
      setStatus('denied');
      return null;
    }
  }, []);

  return { coords, status, request };
}
