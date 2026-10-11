import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle2, MapPin } from 'lucide-react';
import {
  jobSchema,
  CROPS,
  STATES,
  WAGE_UNITS,
  WORK_CATEGORIES,
  type JobInput,
} from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { createJob, getJobWithFarmer, updateJob } from '../lib/queries';
import { useGeolocation } from '../hooks/useGeolocation';
import { Alert, Spinner } from '../components/ui';

export default function PostJob() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const geo = useGeolocation();

  const [serverError, setServerError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    defaultValues: { wage_unit: 'day', images: [], workers_needed: 1 },
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    getJobWithFarmer(id)
      .then((job) => {
        if (!job) return;
        reset({
          title: job.title,
          category: job.category as JobInput['category'],
          description: job.description,
          crop: (job.crop ?? undefined) as JobInput['crop'],
          workers_needed: job.workers_needed,
          start_date: job.start_date,
          end_date: job.end_date,
          wage: job.wage,
          wage_unit: job.wage_unit,
          state: job.state as JobInput['state'],
          district: job.district,
          locality: job.locality,
          requirements: job.requirements ?? undefined,
          images: job.images ?? [],
        });
        if (job.lat != null && job.lng != null) setCoords({ lat: job.lat, lng: job.lng });
      })
      .catch((e) => setServerError(e instanceof Error ? e.message : 'Failed to load job'))
      .finally(() => setLoadingExisting(false));
  }, [id, isEdit, reset]);

  useEffect(() => {
    if (geo.coords) setCoords(geo.coords);
  }, [geo.coords]);

  async function onSubmit(values: JobInput) {
    if (!user) return;
    setServerError(null);
    const payload = {
      ...values,
      crop: values.crop ?? null,
      requirements: values.requirements ?? null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      images: values.images ?? [],
    };
    try {
      if (isEdit && id) {
        await updateJob(id, payload);
        navigate(`/app/jobs/${id}`);
      } else {
        const job = await createJob(user.id, payload);
        setCreatedId(job.id);
      }
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Could not save the job');
    }
  }

  if (loadingExisting) return <Spinner label="Loading job…" />;

  if (createdId) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="aj-card border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <h1 className="mt-3 text-lg font-bold text-green-800">Job Posted!</h1>
          <p className="mt-1 text-sm text-green-700">
            Your job listing is live. Labourers nearby can now see it and apply.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/app/jobs" className="aj-btn-primary">
              View my jobs
            </Link>
            <button
              className="aj-btn-ghost"
              onClick={() => {
                setCreatedId(null);
                reset({ wage_unit: 'day', images: [], workers_needed: 1 });
                setCoords(null);
              }}
            >
              Post another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-text">{isEdit ? 'Edit Job' : 'Post a Job'}</h1>
      <p className="mt-1 text-sm text-brand-muted">Describe the agricultural work you need help with.</p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <Alert tone="error">{serverError}</Alert>}

        <div>
          <label className="aj-label">Job title</label>
          <input className="aj-input" placeholder="e.g. Cotton Picking" {...register('title')} />
          {errors.title && <p className="aj-error">{errors.title.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="aj-label">Work category</label>
            <select className="aj-input" defaultValue="" {...register('category')}>
              <option value="" disabled>
                Select…
              </option>
              {WORK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <p className="aj-error">{errors.category.message}</p>}
          </div>
          <div>
            <label className="aj-label">Crop <span className="font-normal text-brand-muted">(optional)</span></label>
            <select className="aj-input" defaultValue="" {...register('crop')}>
              <option value="">—</option>
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="aj-label">Description</label>
          <textarea className="aj-input min-h-[96px]" placeholder="What the work involves, timing, any details…" {...register('description')} />
          {errors.description && <p className="aj-error">{errors.description.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="aj-label">Workers needed</label>
            <input type="number" min="1" step="1" className="aj-input" {...register('workers_needed', { valueAsNumber: true })} />
            {errors.workers_needed && <p className="aj-error">{errors.workers_needed.message}</p>}
          </div>
          <div>
            <label className="aj-label">Daily wage (₹)</label>
            <input type="number" min="0" className="aj-input" {...register('wage', { valueAsNumber: true })} />
            {errors.wage && <p className="aj-error">{errors.wage.message}</p>}
          </div>
          <div>
            <label className="aj-label">Wage unit</label>
            <select className="aj-input" {...register('wage_unit')}>
              {WAGE_UNITS.map((u) => (
                <option key={u} value={u}>
                  per {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="aj-label">Start date</label>
            <input type="date" className="aj-input" {...register('start_date')} />
            {errors.start_date && <p className="aj-error">{errors.start_date.message}</p>}
          </div>
          <div>
            <label className="aj-label">End date</label>
            <input type="date" className="aj-input" {...register('end_date')} />
            {errors.end_date && <p className="aj-error">{errors.end_date.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="aj-label">State</label>
            <select className="aj-input" defaultValue="" {...register('state')}>
              <option value="" disabled>
                Select…
              </option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && <p className="aj-error">{errors.state.message}</p>}
          </div>
          <div>
            <label className="aj-label">District</label>
            <input className="aj-input" placeholder="e.g. Dharwad" {...register('district')} />
            {errors.district && <p className="aj-error">{errors.district.message}</p>}
          </div>
          <div>
            <label className="aj-label">Village / locality</label>
            <input className="aj-input" placeholder="e.g. Hubli Taluk" {...register('locality')} />
            {errors.locality && <p className="aj-error">{errors.locality.message}</p>}
          </div>
        </div>

        <div>
          <label className="aj-label">Requirements / experience <span className="font-normal text-brand-muted">(optional)</span></label>
          <textarea className="aj-input" placeholder="e.g. Experience with cotton picking preferred" {...register('requirements')} />
        </div>

        <div className="rounded-xl border border-brand-border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Job location coordinates <span className="font-normal text-brand-muted">(optional)</span></p>
              <p className="text-xs text-brand-muted">
                {coords ? `Set: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Lets labourers see distance on the map. Not required.'}
              </p>
            </div>
            <button type="button" className="aj-btn-ghost whitespace-nowrap" onClick={geo.request}>
              <MapPin className="h-4 w-4" /> {geo.status === 'loading' ? 'Locating…' : 'Use my location'}
            </button>
          </div>
          {geo.status === 'denied' && (
            <p className="mt-2 text-xs text-amber-700">
              Location permission denied. You can still post the job; distance just won't be shown.
            </p>
          )}
          {coords && (
            <button type="button" className="mt-2 text-xs text-red-600 underline" onClick={() => setCoords(null)}>
              Clear coordinates
            </button>
          )}
        </div>

        <button type="submit" className="aj-btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Post Job Now'}
        </button>
      </form>
    </div>
  );
}
