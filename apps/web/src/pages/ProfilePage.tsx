import { useEffect, useState } from 'react';
import {
  CROPS,
  SKILLS,
  STATES,
  WORK_CATEGORIES,
  AVAILABILITY,
  type Availability,
  type Crop,
  type Skill,
  type State,
  type WorkCategory,
} from '@agrijoin/shared';
import { useAuth } from '../context/AuthContext';
import {
  getFarmerProfile,
  getLabourerProfile,
  getMyPhone,
  saveCoreProfile,
  saveFarmerProfile,
  saveLabourerProfile,
} from '../lib/queries';
import { ChipGroup, Alert, Spinner } from '../components/ui';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const isFarmer = profile?.role === 'farmer';

  const [loaded, setLoaded] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [stateSel, setStateSel] = useState<State[]>([]);
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [prefs, setPrefs] = useState<WorkCategory[]>([]);
  const [expectedWage, setExpectedWage] = useState('');
  const [availability, setAvailability] = useState<Availability>('available_now');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user || !profile) return;
      setFullName(profile.full_name);
      setStateSel(profile.state ? [profile.state as State] : []);
      setDistrict(profile.district ?? '');
      setVillage(profile.village ?? '');
      setPhone((await getMyPhone()) ?? '');
      if (isFarmer) {
        const fp = await getFarmerProfile(user.id);
        setFarmSize(fp?.farm_size_acres != null ? String(fp.farm_size_acres) : '');
        setCrops((fp?.main_crops ?? []) as Crop[]);
      } else {
        const lp = await getLabourerProfile(user.id);
        setSkills((lp?.skills ?? []) as Skill[]);
        setPrefs((lp?.work_preferences ?? []) as WorkCategory[]);
        setExpectedWage(lp?.expected_wage != null ? String(lp.expected_wage) : '');
        setAvailability(lp?.availability ?? 'available_now');
      }
      setLoaded(true);
    }
    void load();
  }, [user?.id, profile?.id, isFarmer]);

  if (!profile || !loaded) return <Spinner label="Loading profile…" />;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!fullName.trim() || stateSel.length === 0 || !district.trim()) {
      setMsg({ tone: 'error', text: 'Name, state and district are required.' });
      return;
    }
    setSaving(true);
    try {
      await saveCoreProfile(
        user!.id,
        profile!.role,
        { full_name: fullName.trim(), state: stateSel[0], district: district.trim(), village: village.trim() || undefined },
        phone.trim() || undefined,
      );
      if (isFarmer) {
        await saveFarmerProfile(user!.id, { farm_size_acres: farmSize ? Number(farmSize) : null, main_crops: crops });
      } else {
        await saveLabourerProfile(user!.id, {
          skills,
          work_preferences: prefs,
          expected_wage: expectedWage ? Number(expectedWage) : null,
          availability,
        });
      }
      await refreshProfile();
      setMsg({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save profile' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-brand-text">
        {isFarmer ? 'Farmer' : 'Labourer'} Profile
      </h1>
      <p className="mt-1 text-sm text-brand-muted">Update your details anytime.</p>

      <form className="mt-6 space-y-5" onSubmit={onSave} noValidate>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        <div>
          <label className="aj-label">Full name</label>
          <input className="aj-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="aj-label">Mobile number <span className="font-normal text-brand-muted">(private)</span></label>
          <input className="aj-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 99999 99999" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="aj-label">District</label>
            <input className="aj-input" value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <div>
            <label className="aj-label">Village / locality</label>
            <input className="aj-input" value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="aj-label">State</label>
          <ChipGroup options={STATES} value={stateSel} onChange={setStateSel} multiple={false} />
        </div>

        {isFarmer ? (
          <>
            <div>
              <label className="aj-label">Farm size in acres <span className="font-normal text-brand-muted">(optional)</span></label>
              <input className="aj-input" type="number" min="0" step="0.1" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} />
            </div>
            <div>
              <label className="aj-label">Main crops</label>
              <ChipGroup options={CROPS} value={crops} onChange={setCrops} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="aj-label">Skills</label>
              <ChipGroup options={SKILLS} value={skills} onChange={setSkills} />
            </div>
            <div>
              <label className="aj-label">Preferred work</label>
              <ChipGroup options={WORK_CATEGORIES} value={prefs} onChange={setPrefs} />
            </div>
            <div>
              <label className="aj-label">Expected wage ₹/day <span className="font-normal text-brand-muted">(optional)</span></label>
              <input className="aj-input" type="number" min="0" value={expectedWage} onChange={(e) => setExpectedWage(e.target.value)} />
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
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
