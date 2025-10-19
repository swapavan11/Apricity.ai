import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';

export default function ProfileModal({ open, onClose }) {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [mobileLocked, setMobileLocked] = useState(!!user?.mobile);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [countryDial, setCountryDial] = useState('1');
  const COUNTRY_OPTIONS = [
    { code: 'US', dial: '1' }, { code: 'IN', dial: '91' }, { code: 'GB', dial: '44' }, { code: 'CA', dial: '1' }, { code: 'AU', dial: '61' }, { code: 'SG', dial: '65' }, { code: 'DE', dial: '49' }, { code: 'FR', dial: '33' }, { code: 'ZA', dial: '27' }, { code: 'BR', dial: '55' }
  ];

  const buildE164 = (dial, number) => {
    const raw = (number || '').trim();
    if (!raw) return '';
    if (raw.startsWith('+')) {
      const digits = raw.replace(/\D/g, '');
      return digits ? `+${digits}` : '';
    }
    const digits = raw.replace(/\D/g, '');
    const cc = String(dial || '').replace(/\D/g, '');
    if (!digits) return '';
    return `+${cc}${digits}`;
  };

  if (!open) return null;

  // Animate modal on open
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    if (open) {
      // allow first paint, then animate
      const t = setTimeout(() => setAnimateIn(true), 0);
      return () => clearTimeout(t);
    } else {
      setAnimateIn(false);
    }
  }, [open]);

  const saveProfile = async () => {
    try {
      setSaving(true); setErr(''); setMsg('');
      const localDigits = String(mobile || '').replace(/\D/g, '');
      if (localDigits.length !== 10) {
        setErr('Please enter a valid 10-digit mobile number');
        return;
      }
      const e164 = buildE164(countryDial, localDigits);
      if (!e164) {
        setErr('Please enter a valid mobile number with country code');
        return;
      }
      const res = await updateProfile({ mobile: e164 });
      if (res.success) {
        setMsg('Profile updated');
        // Immediately reflect saved state: lock field and show delete button
        setMobile(e164);
        setMobileLocked(true);
      } else {
        setErr(res.message || 'Failed to update profile');
      }
    } finally { setSaving(false); }
  };

  const deleteMobileAndUnlock = async () => {
    try {
      setSaving(true); setErr(''); setMsg('');
      const res = await updateProfile({ mobile: '' });
      if (res.success) {
        setMsg('Mobile number removed. Please enter a new number.');
        setMobile('');
        setMobileLocked(false);
      } else {
        setErr(res.message || 'Failed to remove mobile number');
      }
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    try {
      setChanging(true); setErr(''); setMsg('');
  const payload = { newPassword };
  if (user?.hasPassword) payload.currentPassword = currentPassword; // only required if existing password present
      if (!user?.hasPassword && newPassword !== confirmPassword) {
        setErr('Passwords do not match');
        setChanging(false);
        return;
      }
      const resp = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success) {
        setMsg(data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Update local user if returned, else do a lightweight refresh
        try {
          if (data.user) {
            // We don't have setUser here; trigger a no-op profile update to refresh context
            await updateProfile({});
          } else {
            await updateProfile({});
          }
        } catch {}
      }
      else setErr(data.message || 'Failed to change password');
    } catch (e) {
      setErr('Failed to change password');
    } finally { setChanging(false); }
  };

  const avatarUrl = user?.avatar;
  const initials = user?.name?.charAt(0)?.toUpperCase() || 'U';

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(''); setMsg('');
    const res = await uploadAvatar(file);
    if (res.success) setMsg('Avatar updated'); else setErr(res.message || 'Failed to upload avatar');
    setUploading(false);
  };

  const removeAvatar = async () => {
    setSaving(true); setErr(''); setMsg('');
    const res = await updateProfile({ avatar: '' });
    if (res.success) setMsg('Avatar removed'); else setErr(res.message || 'Failed to remove avatar');
    setSaving(false);
  };

  // Auto-dismiss pop messages after 4 seconds
  useEffect(() => {
    if (!msg && !err) return;
    const t = setTimeout(() => { setMsg(''); setErr(''); }, 4000);
    return () => clearTimeout(t);
  }, [msg, err]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, opacity: animateIn ? 1 : 0, transition: 'opacity 180ms ease' }}>
  <div style={{ width: 'min(760px, 94vw)', boxSizing:'border-box', maxWidth: 760, display:'flex', flexDirection:'column', background: 'var(--panel)', border:'1px solid #1f2b57', borderRadius: 12, overflow:'hidden', transform: animateIn ? 'scale(1)' : 'scale(0.96)', opacity: animateIn ? 1 : 0, transition: 'transform 200ms ease, opacity 200ms ease' }}>
        <div style={{ background:'linear-gradient(135deg, var(--accent), var(--accent2))', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, color:'#0a0f25' }}>Your Profile</h3>
          <button onClick={onClose} style={{ background:'#0f1530', border:'1px solid #1f2b57', color:'var(--muted)', padding:'6px 10px', borderRadius:6, cursor:'pointer' }}>Close</button>
        </div>
        <div style={{ padding:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'30% 70%', gap:20, alignItems:'stretch' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', gap:12, alignSelf:'center' }}>
            <div style={{ position:'relative', width:180, height:180 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" onError={(e)=>{ e.currentTarget.style.display='none'; }} style={{ width:180, height:180, borderRadius:'50%', objectFit:'cover', border:'2px solid #1f2b57' }} />
            ) : (
              <div style={{ width:180, height:180, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#0a0f25', fontWeight:900, fontSize:64, border:'2px solid #1f2b57' }}>
                {initials}
              </div>
            )}
            <button onClick={()=>setShowAvatarMenu(v=>!v)} title="Edit avatar" style={{ position:'absolute', right:12, bottom:12, width:44, height:44, borderRadius:'50%', background:'#0f1530', border:'1px solid #1f2b57', color:'var(--text)', cursor:'pointer', display:'grid', placeItems:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                <path d="M20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="currentColor"/>
              </svg>
            </button>
            {showAvatarMenu && (
              <div style={{ position:'absolute', right:10, bottom:56, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, padding:8, display:'grid', gap:6, minWidth:160, zIndex:10 }}>
                <label style={{ display:'block', color:'var(--text)', cursor:'pointer', padding:'6px 8px', borderRadius:6, border:'1px solid #1f2b57' }}>
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" onChange={(e)=>{ setShowAvatarMenu(false); onAvatarFile(e); }} style={{ display:'none' }} />
                </label>
                {avatarUrl && (
                  <button onClick={()=>{ setShowAvatarMenu(false); removeAvatar(); }} style={{ textAlign:'left', background:'none', border:'1px solid #1f2b57', color:'#f36', padding:'6px 8px', borderRadius:6, cursor:'pointer' }}>Remove</button>
                )}
                <button onClick={()=>setShowAvatarMenu(false)} style={{ textAlign:'left', background:'none', border:'1px solid #1f2b57', color:'var(--muted)', padding:'6px 8px', borderRadius:6, cursor:'pointer' }}>Cancel</button>
              </div>
            )}
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ color:'var(--text)', fontWeight:800, fontSize:22 }}>{user?.name}</div>
              <div style={{ color:'var(--muted)', fontSize:13 }}>{user?.email}</div>
            </div>
          </div>
          <div style={{ maxWidth: 480, width:'100%' }}>
            {msg && <div style={{ background:'#223a2a', border:'1px solid #2f8f46', color:'#bcedc3', padding:10, borderRadius:10, marginBottom:14 }}>{msg}</div>}
            {err && <div style={{ background:'#412426', border:'1px solid #a64b53', color:'#f0b8bc', padding:10, borderRadius:10, marginBottom:14 }}>{err}</div>}
            <div style={{ display:'grid', gap:28 }}>
              <div>
            <div style={{ marginBottom:8, color:'var(--text)', fontWeight:600 }}>Contact</div>
            <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Email</label>
                <input value={user?.email || ''} disabled readOnly style={{ width:'100%', padding:10, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, color:'var(--muted)', marginBottom:12 }} />
            <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Mobile number</label>
            {mobileLocked ? (
              <input
                value={mobile}
                onChange={(e)=>setMobile(e.target.value)}
                placeholder="e.g. +911234567890"
                    style={{ width:'100%', padding:10, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, color:'var(--text)', marginBottom:12 }}
                disabled
                readOnly
              />
            ) : (
              <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                <select
                  value={countryDial}
                  onChange={(e)=>setCountryDial(e.target.value)}
                      style={{ padding:10, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, color:'var(--text)', minWidth:110 }}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.dial}>+{opt.dial} {opt.code}</option>
                  ))}
                </select>
                <input
                  value={mobile}
                  onChange={(e)=>setMobile(e.target.value)}
                  placeholder="Enter mobile number"
                      style={{ flex:1, padding:10, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, color:'var(--text)' }}
                />
              </div>
            )}
            {!mobileLocked && mobile && String(mobile).replace(/\D/g, '').length !== 10 && (
              <div style={{ color:'#f36', fontSize:12, marginTop:6 }}>Mobile number must be exactly 10 digits.</div>
            )}
            {mobileLocked ? (
              <div style={{ marginTop:14, display:'flex', justifyContent:'center' }}>
                    <button onClick={deleteMobileAndUnlock} disabled={saving} style={{ background:'none', border:'1px solid #a64b53', color:'#f36', padding:'10px 14px', borderRadius:8, fontWeight:700, cursor:'pointer' }}>Delete number and re-enter</button>
              </div>
            ) : (
              <div style={{ marginTop:14, display:'flex', justifyContent:'center' }}>
                    <button onClick={saveProfile} disabled={saving || !mobile || String(mobile).replace(/\D/g, '').length !== 10} style={{ background:'var(--accent)', color:'#0a0f25', border:'none', padding:'10px 14px', borderRadius:8, fontWeight:700, cursor:'pointer' }}>{saving ? 'Saving…' : 'Save number'}</button>
              </div>
            )}
              </div>
              <div style={{ borderTop:'1px solid #1f2b57', paddingTop:16 }}>
                <div style={{ marginBottom:8, color:'var(--text)', fontWeight:600 }}>Security</div>
                {user?.hasPassword ? (
                  <>
                    <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Current password</label>
                    <input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} placeholder="Current password" style={{ width:'100%', padding:10, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, color:'var(--text)', marginBottom:12 }} />
                  </>
                ) : (
                  <div style={{ color:'var(--muted)', fontSize:12, marginBottom:8 }}>No password set (OAuth account). You can set a password below.</div>
                )}
                <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>New password</label>
                <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="At least 6 characters" style={{ width:'100%', padding:10, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, color:'var(--text)', marginBottom:12 }} />
                {!user?.hasPassword && (
                  <>
                    <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Confirm new password</label>
                    <input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Re-enter new password" style={{ width:'100%', padding:10, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, color:'var(--text)', marginBottom:8 }} />
                    {confirmPassword && confirmPassword !== newPassword && (
                      <div style={{ color:'#f36', fontSize:12, marginBottom:8 }}>Passwords do not match.</div>
                    )}
                  </>
                )}
                <div style={{ marginTop:14, display:'flex', justifyContent:'center' }}>
                      <button onClick={changePassword} disabled={changing || !newPassword || (!user?.hasPassword && newPassword !== confirmPassword)} style={{ background:'var(--accent)', color:'#0a0f25', border:'none', padding:'10px 14px', borderRadius:8, fontWeight:700, cursor:'pointer' }}>{changing ? 'Updating…' : (user?.hasPassword ? 'Change password' : 'Set password')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
