import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';

export default function ProfileModal({ open, onClose, themePref, setThemePref }) {
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
     { code: 'IN', dial: '91' }, { code: 'US', dial: '1' }, { code: 'GB', dial: '44' }, { code: 'CA', dial: '1' }, { code: 'AU', dial: '61' }, { code: 'SG', dial: '65' }, { code: 'DE', dial: '49' }, { code: 'FR', dial: '33' }, { code: 'ZA', dial: '27' }, { code: 'BR', dial: '55' }
  ];

  // Voice preference
  const [voicePref, setVoicePref] = useState(localStorage.getItem('voicePreference') || '');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [testingSpeech, setTestingSpeech] = useState(false);

  // Bubble theme preference
  const [bubbleTheme, setBubbleTheme] = useState(localStorage.getItem('userBubbleTheme') || 'blue');
  
  const bubbleThemes = {
    // Gradient themes
    purple: { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", name: "Purple Dream" },
    blue: { background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", name: "Ocean Blue" },
    green: { background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", name: "Fresh Green" },
    orange: { background: "linear-gradient(135deg, #f46b45 0%, #eea849 100%)", name: "Sunset Orange" },
    pink: { background: "linear-gradient(135deg, #e91e63 0%, #f06292 100%)", name: "Pink Rose" },
    teal: { background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", name: "Cool Teal" },
    red: { background: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)", name: "Fiery Red" },
    indigo: { background: "linear-gradient(135deg, #5f72bd 0%, #9b23ea 100%)", name: "Deep Indigo" },
    // Solid dark themes
    slate: { background: "#1e293b", name: "Slate Dark" },
    charcoal: { background: "#2d3748", name: "Charcoal" },
    navy: { background: "#1a202c", name: "Navy Dark" },
    forest: { background: "#1b3a2f", name: "Forest Dark" },
    burgundy: { background: "#3e1f2a", name: "Burgundy Dark" },
    midnight: { background: "#0f172a", name: "Midnight" },
  };

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        
        // If no preference set, or preference is invalid, find a good default
        const savedPref = localStorage.getItem('voicePreference');
        if (!savedPref || !voices.find(v => v.name === savedPref)) {
          // Find Gini (Google Hindi) as default (best quality), then other good voices
          const defaultVoice = voices.find(v => v.name === 'Google हिन्दी') ||
            voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.name.includes('Microsoft Zira')) ||
            voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0]; // Fallback to first available voice
          
          if (defaultVoice) {
            setVoicePref(defaultVoice.name);
            localStorage.setItem('voicePreference', defaultVoice.name);
          }
        } else {
          setVoicePref(savedPref);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Cleanup: stop any speech when modal closes
    return () => {
      window.speechSynthesis.cancel();
      setTestingSpeech(false);
    };
  }, []);

  const handleVoiceChange = (voiceName) => {
    setVoicePref(voiceName);
    localStorage.setItem('voicePreference', voiceName);
    
    // Trigger a custom event so ChatTutor can update immediately
    window.dispatchEvent(new CustomEvent('voicePreferenceChanged', { detail: voiceName }));
  };

  const handleBubbleThemeChange = (themeKey) => {
    setBubbleTheme(themeKey);
    localStorage.setItem('userBubbleTheme', themeKey);
    
    // Trigger a custom event so ChatTutor can update immediately
    window.dispatchEvent(new CustomEvent('userBubbleThemeChanged', { detail: themeKey }));
  };

  const testVoice = () => {
    if (testingSpeech) {
      window.speechSynthesis.cancel();
      setTestingSpeech(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Use phonetic spelling to get correct pronunciation (hard G like "gun")
    const testText = "Hello! This is how I sound. I'm Ginny, your AI tutor, ready to help you learn.";
    const utterance = new SpeechSynthesisUtterance(testText);
    
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(voice => voice.name === voicePref);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // More human-like speech settings
    utterance.rate = 0.9; // Slower, more conversational pace
    utterance.pitch = 1.0; // Natural pitch
    utterance.volume = 1.0; // Full volume
    
    utterance.onstart = () => setTestingSpeech(true);
    utterance.onend = () => setTestingSpeech(false);
    utterance.onerror = () => setTestingSpeech(false);
    
    window.speechSynthesis.speak(utterance);
  };

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
  <div style={{ width: 'min(1200px, 94vw)', boxSizing:'border-box', maxWidth: 1200, display:'flex', flexDirection:'column', background: 'var(--panel)', border:'1px solid var(--border)', borderRadius: 12, overflow:'hidden', transform: animateIn ? 'scale(1)' : 'scale(0.96)', opacity: animateIn ? 1 : 0, transition: 'transform 200ms ease, opacity 200ms ease' }}>
        <div style={{ background:'linear-gradient(135deg, var(--accent), var(--accent2))', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, color:'#0a0f25' }}>Your Profile</h3>
          <button onClick={onClose} style={{ background:'var(--input-bg)', border:'1px solid var(--border)', color:'var(--muted)', padding:'6px 10px', borderRadius:6, cursor:'pointer' }}>Close</button>
        </div>
        <div style={{ padding:'24px', display:'flex', flexDirection:'column', maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', gap:24, alignItems:'stretch', minHeight:0 }}>
          {/* Avatar Section - 25% */}
          <div style={{ flex:'0 0 25%', minWidth:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, paddingRight:20 }}>
            <div style={{ position:'relative', width:160, height:160 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" onError={(e)=>{ e.currentTarget.style.display='none'; }} style={{ width:160, height:160, borderRadius:'50%', objectFit:'cover', border:'3px solid var(--border)' }} />
            ) : (
              <div style={{ width:160, height:160, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#0a0f25', fontWeight:900, fontSize:64, border:'3px solid var(--border)' }}>
                {initials}
              </div>
            )}
            <button onClick={()=>setShowAvatarMenu(v=>!v)} title="Edit avatar" style={{ position:'absolute', right:0, bottom:0, width:36, height:36, borderRadius:'50%', background:'var(--input-bg)', border:'2px solid var(--border)', color:'var(--text)', cursor:'pointer', display:'grid', placeItems:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                <path d="M20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="currentColor"/>
              </svg>
            </button>
            {showAvatarMenu && (
              <div style={{ position:'absolute', right:10, bottom:56, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, padding:8, display:'grid', gap:6, minWidth:160, zIndex:10 }}>
                <label style={{ display:'block', color:'var(--text)', cursor:'pointer', padding:'6px 8px', borderRadius:6, border:'1px solid var(--border)' }}>
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" onChange={(e)=>{ setShowAvatarMenu(false); onAvatarFile(e); }} style={{ display:'none' }} />
                </label>
                {avatarUrl && (
                  <button onClick={()=>{ setShowAvatarMenu(false); removeAvatar(); }} style={{ textAlign:'left', background:'none', border:'1px solid var(--border)', color:'#f36', padding:'6px 8px', borderRadius:6, cursor:'pointer' }}>Remove</button>
                )}
                <button onClick={()=>setShowAvatarMenu(false)} style={{ textAlign:'left', background:'none', border:'1px solid var(--border)', color:'var(--muted)', padding:'6px 8px', borderRadius:6, cursor:'pointer' }}>Cancel</button>
              </div>
            )}
            </div>
            <div style={{ textAlign:'center', width:'100%' }}>
              <div style={{ color:'var(--text)', fontWeight:800, fontSize:22, marginBottom:6 }}>{user?.name}</div>
              <div style={{ color:'var(--muted)', fontSize:12, wordBreak:'break-all' }}>{user?.email}</div>
            </div>
          </div>
          {/* Preferences Section - 37.5% */}
          <div style={{ flex:'1', minWidth:300, display:'flex', flexDirection:'column', gap:16, paddingLeft:16, paddingRight:20 }}>
            <div style={{ marginBottom:4, color:'var(--text)', fontWeight:700, fontSize:16 }}>Preferences</div>
            <div style={{ display:'grid', gap:18 }}>
              {/* Appearance section */}
              <div>
                <div style={{ marginBottom:8, color:'var(--text)', fontWeight:600 }}>Appearance</div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {['light','dark','system'].map(opt => (
                    <label key={opt} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', border:`1px solid ${themePref===opt ? 'var(--accent)' : 'var(--border)'}`, borderRadius:8, cursor:'pointer', background: themePref===opt ? 'rgba(124,156,255,0.12)' : 'transparent', transition:'border-color .15s ease, background-color .15s ease' }}>
                      <input type="radio" name="themePref" value={opt} checked={themePref===opt} onChange={(e)=> setThemePref && setThemePref(e.target.value)} />
                      <span style={{ textTransform:'capitalize' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Voice preference section */}
              <div>
                <div style={{ marginBottom:8, color:'var(--text)', fontWeight:600 }}>Voice Preference</div>
                <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Select AI voice for Read Aloud</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <select 
                    value={voicePref} 
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    style={{ flex:1, padding:'8px 10px', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:'13px', maxWidth:'85%' }}
                  >
                    {availableVoices.length === 0 ? (
                      <option value="">Loading voices...</option>
                    ) : (
                      <>
                        {/* Group English voices */}
                        <optgroup label="English Voices">
                          {availableVoices
                            .filter(v => v.lang.startsWith('en'))
                            .sort((a, b) => {
                              // Prioritize certain voices at the top
                              const priority = ['Google', 'Zira', 'Karen', 'Victoria', 'Female'];
                              const aIndex = priority.findIndex(p => a.name.includes(p));
                              const bIndex = priority.findIndex(p => b.name.includes(p));
                              if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                              if (aIndex !== -1) return -1;
                              if (bIndex !== -1) return 1;
                              return a.name.localeCompare(b.name);
                            })
                            .map(voice => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))
                          }
                        </optgroup>
                        {/* Show other language voices if available */}
                        {availableVoices.filter(v => !v.lang.startsWith('en')).length > 0 && (
                          <optgroup label="Other Languages">
                            {availableVoices
                              .filter(v => !v.lang.startsWith('en'))
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(voice => (
                                <option key={voice.name} value={voice.name}>
                                  {voice.name === 'Google हिन्दी' ? 'गिनी (Gini)' : voice.name} ({voice.lang})
                                </option>
                              ))
                            }
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>
                  <button
                    onClick={testVoice}
                    disabled={!voicePref || availableVoices.length === 0}
                    title={testingSpeech ? "Stop" : "Test voice"}
                    style={{
                      background: testingSpeech ? "rgba(239, 68, 68, 0.15)" : "var(--input-bg)",
                      border: "1px solid",
                      borderColor: testingSpeech ? "rgba(239, 68, 68, 0.4)" : "var(--border)",
                      color: testingSpeech ? "#ef4444" : "var(--text)",
                      padding: "10px 14px",
                      borderRadius: 8,
                      cursor: (!voicePref || availableVoices.length === 0) ? "not-allowed" : "pointer",
                      opacity: (!voicePref || availableVoices.length === 0) ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    {testingSpeech ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <div style={{ color:'var(--muted)', fontSize:11, marginTop:6 }}>
                  {voicePref ? (
                    <>Currently using: <strong style={{ color:'var(--text)' }}>
                      {voicePref === 'Google हिन्दी' ? 'गिनी (Gini)' : voicePref}
                    </strong></>
                  ) : (
                    'Select a voice and click the speaker to test'
                  )}
                </div>
              </div>
              {/* Message Bubble Theme section */}
              <div>
                <div style={{ marginBottom:8, color:'var(--text)', fontWeight:600 }}>Message Bubble Theme</div>
                <label style={{ display:'block', color:'var(--muted)', marginBottom:10, fontSize:12 }}>Choose your message bubble appearance</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:10, marginBottom:10 }}>
                  {Object.entries(bubbleThemes).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => handleBubbleThemeChange(key)}
                      title={theme.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '50%',
                        background: theme.background,
                        border: bubbleTheme === key ? '3px solid var(--accent)' : '2px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: bubbleTheme === key ? '0 0 0 2px var(--panel), 0 0 12px rgba(124, 156, 255, 0.5)' : 'none',
                        transform: bubbleTheme === key ? 'scale(1.1)' : 'scale(1)',
                      }}
                      onMouseEnter={(e) => {
                        if (bubbleTheme !== key) {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (bubbleTheme !== key) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    />
                  ))}
                </div>
                <div style={{ color:'var(--muted)', fontSize:11 }}>
                  Selected: <strong style={{ color:'var(--text)' }}>{bubbleThemes[bubbleTheme].name}</strong>
                </div>
              </div>
            </div>
          </div>
          {/* Contact & Security Section - 37.5% */}
          <div style={{ flex:'1', minWidth:300, display:'flex', flexDirection:'column', gap:16, paddingLeft:16 }}>
            <div style={{ marginBottom:4, color:'var(--text)', fontWeight:700, fontSize:16 }}>Contact & Security</div>
            {msg && <div style={{ background:'var(--success-bg)', border:'1px solid var(--success-border)', color:'var(--success-text)', padding:10, borderRadius:10 }}>{msg}</div>}
            {err && <div style={{ background:'var(--error-bg)', border:'1px solid var(--error-border)', color:'var(--error-text)', padding:10, borderRadius:10 }}>{err}</div>}
            <div style={{ display:'grid', gap:18 }}>
              <div>
            <div style={{ marginBottom:8, color:'var(--text)', fontWeight:600 }}>Contact</div>
            <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Email</label>
                <input value={user?.email || ''} disabled readOnly style={{ width:'100%', padding:10, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--muted)', marginBottom:12, boxSizing:'border-box' }} />
            <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Mobile number</label>
            {mobileLocked ? (
              <input
                value={mobile}
                onChange={(e)=>setMobile(e.target.value)}
                placeholder="e.g. +911234567890"
                    style={{ width:'100%', padding:10, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', marginBottom:12, boxSizing:'border-box' }}
                disabled
                readOnly
              />
            ) : (
              <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                <select
                  value={countryDial}
                  onChange={(e)=>setCountryDial(e.target.value)}
                      style={{ padding:10, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', minWidth:110, boxSizing:'border-box' }}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.dial}>+{opt.dial} {opt.code}</option>
                  ))}
                </select>
                <input
                  value={mobile}
                  onChange={(e)=>setMobile(e.target.value)}
                  placeholder="Enter mobile number"
                      style={{ flex:1, padding:10, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', boxSizing:'border-box' }}
                />
              </div>
            )}
            {!mobileLocked && mobile && String(mobile).replace(/\D/g, '').length !== 10 && (
              <div style={{ color:'#f36', fontSize:12, marginTop:6 }}>Mobile number must be exactly 10 digits.</div>
            )}
            {mobileLocked ? (
              <div style={{ marginTop:14, display:'flex', justifyContent:'center' }}>
                    <button onClick={deleteMobileAndUnlock} disabled={saving} style={{ background:'none', border:'1px solid #a64b53', color:'#f36', padding:'10px 14px', borderRadius:8, fontWeight:700, cursor:'pointer' }}>Delete my number</button>
              </div>
            ) : (
              <div style={{ marginTop:14, display:'flex', justifyContent:'center' }}>
                    <button onClick={saveProfile} disabled={saving || !mobile || String(mobile).replace(/\D/g, '').length !== 10} style={{ background:'var(--accent)', color:'#0a0f25', border:'none', padding:'10px 14px', borderRadius:8, fontWeight:700, cursor:'pointer' }}>{saving ? 'Saving…' : 'Save number'}</button>
              </div>
            )}
              </div>
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
                <div style={{ marginBottom:8, color:'var(--text)', fontWeight:600 }}>Security</div>
                {user?.hasPassword ? (
                  <>
                    <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Current password</label>
                    <input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} placeholder="Current password" style={{ width:'100%', padding:10, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', marginBottom:12, boxSizing:'border-box' }} />
                  </>
                ) : (
                  <div style={{ color:'var(--muted)', fontSize:12, marginBottom:8 }}>No password set (OAuth account). You can set a password below.</div>
                )}
                <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>New password</label>
                <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="At least 6 characters" style={{ width:'100%', padding:10, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', marginBottom:12, boxSizing:'border-box' }} />
                {!user?.hasPassword && (
                  <>
                    <label style={{ display:'block', color:'var(--muted)', marginBottom:6, fontSize:12 }}>Confirm new password</label>
                    <input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Re-enter new password" style={{ width:'100%', padding:10, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', marginBottom:8, boxSizing:'border-box' }} />
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
