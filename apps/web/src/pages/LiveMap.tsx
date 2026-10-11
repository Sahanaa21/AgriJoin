import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { formatWage, type JobWithFarmer } from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { listMyJobs, listOpenJobs } from '../lib/queries';
import { useGeolocation } from '../hooks/useGeolocation';
import { Alert, EmptyState, ErrorState, Spinner } from '../components/ui';

const KARNATAKA_CENTER: [number, number] = [15.3173, 75.7139];

function pin(color: string) {
  return L.divIcon({
    className: 'aj-pin',
    html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}
const JOB_PIN = pin('#3F8F4F');
const ME_PIN = pin('#E77835');

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      map.fitBounds(L.latLngBounds(points).pad(0.2));
    }
  }, [points, map]);
  return null;
}

export default function LiveMap() {
  const { user, profile } = useAuth();
  const geo = useGeolocation();
  const [jobs, setJobs] = useState<JobWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFarmer = profile?.role === 'farmer';

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      if (isFarmer) {
        setJobs(await listMyJobs(user.id));
      } else {
        const { rows } = await listOpenJobs({ page: 1, page_size: 50, sort: 'recent' }, geo.coords);
        setJobs(rows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.id, isFarmer]);

  const withCoords = useMemo(() => jobs.filter((j) => j.lat != null && j.lng != null), [jobs]);
  const points = useMemo<[number, number][]>(() => {
    const pts = withCoords.map((j) => [j.lat as number, j.lng as number] as [number, number]);
    if (geo.coords) pts.push([geo.coords.lat, geo.coords.lng]);
    return pts;
  }, [withCoords, geo.coords]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Live Map</h1>
          <p className="text-sm text-brand-muted">
            {withCoords.length} {isFarmer ? 'of your jobs' : 'open jobs'} with a location
            {jobs.length - withCoords.length > 0 && ` · ${jobs.length - withCoords.length} without coordinates (listed below)`}
          </p>
        </div>
        {!geo.coords && (
          <button className="aj-btn-ghost" onClick={geo.request}>
            <MapPin className="h-4 w-4" /> Show my location
          </button>
        )}
      </div>

      {geo.status === 'denied' && (
        <Alert tone="warning">Location permission denied. The map still shows job locations.</Alert>
      )}

      {loading ? (
        <Spinner label="Loading map…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="aj-card overflow-hidden p-0">
            <MapContainer center={KARNATAKA_CENTER} zoom={7} style={{ height: '60vh', width: '100%' }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds points={points} />
              {geo.coords && (
                <Marker position={[geo.coords.lat, geo.coords.lng]} icon={ME_PIN}>
                  <Popup>You are here</Popup>
                </Marker>
              )}
              {withCoords.map((j) => (
                <Marker key={j.id} position={[j.lat as number, j.lng as number]} icon={JOB_PIN}>
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold">{j.title}</p>
                      <p className="text-xs">
                        {formatWage(j.wage, j.wage_unit)} · {j.locality}, {j.district}
                      </p>
                      <p className="text-xs capitalize text-brand-muted">Status: {j.status}</p>
                      <Link to={`/app/jobs/${j.id}`} className="text-xs font-semibold text-brand-green">
                        View details →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {withCoords.length === 0 && (
            <EmptyState
              title="No mapped jobs yet"
              description={
                isFarmer
                  ? 'Add coordinates when posting a job (optional) to see it on the map.'
                  : 'None of the current open jobs have coordinates. Try the Browse list instead.'
              }
            />
          )}

          {jobs.length - withCoords.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-brand-text">Jobs without map coordinates</h2>
              <div className="aj-card divide-y divide-brand-border">
                {jobs
                  .filter((j) => j.lat == null || j.lng == null)
                  .map((j) => (
                    <Link key={j.id} to={`/app/jobs/${j.id}`} className="flex items-center justify-between p-3 hover:bg-brand-light/40">
                      <span className="text-sm font-medium">{j.title}</span>
                      <span className="text-xs text-brand-muted">
                        {j.locality}, {j.district}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
