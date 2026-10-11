import { useCallback, useState } from 'react';
import type { LatLng } from '@agrijoin/shared';

type GeoState = {
  coords: LatLng | null;
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';
  error: string | null;
};

/**
 * Device geolocation with explicit consent. Nothing happens until the user
 * calls `request()`. If permission is denied or unavailable, callers fall
 * back to manual location entry / textual location — never a fake position.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ coords: null, status: 'idle', error: null });

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ coords: null, status: 'unsupported', error: 'Geolocation is not supported by this browser' });
      return;
    }
    setState((s) => ({ ...s, status: 'loading', error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          status: 'granted',
          error: null,
        });
      },
      (err) => {
        setState({ coords: null, status: 'denied', error: err.message });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const setManual = useCallback((coords: LatLng | null) => {
    setState({ coords, status: coords ? 'granted' : 'idle', error: null });
  }, []);

  return { ...state, request, setManual };
}
