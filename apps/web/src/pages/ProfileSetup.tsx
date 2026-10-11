import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  CROPS,
  SKILLS,
  STATES,
  WORK_CATEGORIES,
  AVAILABILITY,
  type Crop,
  type Skill,
  type State,
  type WorkCategory,
  type Availability,
  type Role,
} from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import { saveCoreProfile, saveFarmerProfile, saveLabourerProfile } from '../lib/queries';
import { ChipGroup, Alert, Spinner } from '../components/ui';

export default function ProfileSetup() {
  const { role } = useParams<{ role: Role }>();
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<State[]>([]);
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [prefs, setPrefs] = useState<WorkCategory[]>([]);
  const [expectedWage, setExpectedWage] = useState('');
  const [availability, setAvailability] = useState<Availability>('available_now');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/signin', { replace: true });
    else if (profile) navigate('/app/dashboard', { replace: true });
    setFullName(sessionStorage.getItem('aj_pending_name') ?? '');
    setPhone(sessionStorage.getItem('aj_pending_phone') ?? '');
  }, [user, profile, loading, navigate]);

  if (loading || !user) return <Spinner />;
  const isFarmer = role === 'farmer';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError('Full name is required');
    if (state.length === 0) return setError('Please select your state');
    if (!district.trim()) return setError('District is required');
    if (isFarmer && crops.length === 0) return setError('Select at least one crop');
    if (!isFarmer && skills.length === 0) return setError('Select at least one skill');

    setSaving(true);
    try {
      await saveCoreProfile(
        user!.id,
        role as Role,
        { full_name: fullName.trim(), state: state[0], district: district.trim(), village: village.trim() || undefined },
        phone.trim() || undefined,
      );
      if (isFarmer) {
        await saveFarmerProfile(user!.id, {
          farm_size_acres: farmSize ? Number(farmSize) : null,
          main_crops: crops,
        });
      } else {
        await saveLabourerProfile(user!.id, {
          skills,
          work_preferences: prefs,
          expected_wage: expectedWage ? Number(expectedWage) : null,
          availability,
        });
      }
      sessionStorage.removeItem('aj_pending_name');
      sessionStorage.removeItem('aj_pending_phone');
      await refreshProfile();
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-text">Set Up Your Profile</h1>
      <p className="mt-1 text-sm text-brand-muted">
        {isFarmer ? 'Tell us about your farm' : 'Tell us about your work experience'}
      </p>

      <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <label className="aj-label">Full name</label>
          <input className="aj-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div>
          <label className="aj-label">
            Mobile number <span className="font-normal text-brand-muted">(optional, kept private)</span>
          </label>
          <input className="aj-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 99999 99999" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="aj-label">District</label>
            <input className="aj-input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Mysuru, Hassan" />
          </div>
          <div>
            <label className="aj-label">Village / locality</label>
            <input className="aj-input" value={village} onChange={(e) => setVillage(e.target.value)} placeholder="e.g. Betta" />
          </div>
        </div>

        <div>
          <label className="aj-label">State</label>
          <ChipGroup options={STATES} value={state} onChange={setState} multiple={false} />
        </div>

        {isFarmer ? (
          <>
            <div>
              <label className="aj-label">Farm size in acres <span className="font-normal text-brand-muted">(optional)</span></label>
              <input className="aj-input" type="number" min="0" step="0.1" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} placeholder="e.g. 5.5" />
            </div>
            <div>
              <label className="aj-label">Main crops</label>
              <ChipGroup options={CROPS} value={crops} onChange={setCrops} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="aj-label">Your skills</label>
              <ChipGroup options={SKILLS} value={skills} onChange={setSkills} />
            </div>
            <div>
              <label className="aj-label">Preferred work <span className="font-normal text-brand-muted">(optional)</span></label>
              <ChipGroup options={WORK_CATEGORIES} value={prefs} onChange={setPrefs} />
            </div>
            <div>
              <label className="aj-label">Expected wage ₹/day <span className="font-normal text-brand-muted">(optional)</span></label>
              <input className="aj-input" type="number" min="0" value={expectedWage} onChange={(e) => setExpectedWage(e.target.value)} placeholder="e.g. 450" />
            </div>
            <div>
              <label className="aj-label">Availability</label>
              <select className="aj-input" value={availability} onChange={(e) => setAvailability(e.target.value as Availability)}>
                {AVAILABILITY.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <button type="submit" className="aj-btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Create Profile & Continue'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
