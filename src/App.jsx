import React, { useState, useEffect, useRef } from 'react';
// --- FIREBASE IMPORTS ---
// If firebase.js is missing/broken, this might return undefined. We handle that below.
import { db } from './firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

// NOTE: Metadata imports are removed from here to prevent "White Screen" crashes.
// They are loaded dynamically inside the Upload Modal now.

import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Home, Search, Library, Download, Heart, 
  MoreHorizontal, Disc, Mic2, X, Check,
  Music, Settings, User, Headphones, Sparkles,
  Wand2, Cpu, Loader2, UploadCloud, Plus, Upload, 
  Image as ImageIcon, Lock, Trash2, Link as LinkIcon,
  Calendar, Building2, Tag, AlertCircle, FileText, Copyright,
  TrendingUp, Layers, Newspaper, Shuffle, Repeat, Clock, Activity,
  MessageSquarePlus, Send, Menu, ChevronRight, ListMusic, Inbox, FileAudio
} from 'lucide-react';

// --- UTILITY: GOOGLE DRIVE LINK CONVERTER ---
const getDirectUrl = (url) => {
  if (!url) return "";
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/(.*?)\/|id=(.*?)(&|$)/);
    const fileId = idMatch ? (idMatch[1] || idMatch[2]) : null;
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }
  return url;
};

// --- UTILITY: FORMAT DURATION ---
const formatDuration = (seconds) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

// --- GEMINI API CONFIG ---
const apiKey = ""; 

const callGemini = async (prompt) => {
  if (!apiKey) {
    console.warn("No API key found. Simulating response.");
    return new Promise(resolve => setTimeout(() => resolve("This is a simulated AI response. The API key was not detected, but in a real environment, Gemini would generate rich text here based on your prompt."), 1500));
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) throw new Error("Gemini API Error");

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis unavailable.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Unable to connect to the AI Audio Engine. Please try again later.";
  }
};

// --- MOCK DATA ---
const MOCK_LYRICS = [
  "In the silence of the night",
  "Frequencies behave like light",
  "Digital waves across the screen",
  "The clearest sound you've ever seen",
  "Bits and bytes, a flowing stream",
  "Waking up from analog dreams",
  "High fidelity, pure and true",
  "This is the sound of me and you",
  "Lossless data, perfect file",
  "Stay with the music for a while",
  "Resonance in every tone",
  "Listening in the dark alone",
  "Bass drops low, treble highs",
  "Audio truth, no compromise",
  "Fade out slowly into black",
  "Waiting for the next track"
];

const INITIAL_ALBUMS = [
  {
    id: 1,
    title: "Midnight Frequencies",
    artist: "The Neural Network",
    year: "2023",
    genre: "Electronic",
    studio: "Mainframe Studios",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop",
    color: "from-violet-600",
    songs: [
      { id: 101, title: "Deep Dive", duration: "3:42", specs: "24-bit / 96kHz", formats: ["FLAC", "ALAC", "M4A", "MP3"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", links: { FLAC: "https://drive.google.com/drive/folders/demo-flac", MP3: "https://drive.google.com/drive/folders/demo-mp3" } },
      { id: 102, title: "Latency Zero", duration: "4:15", specs: "16-bit / 44.1kHz", formats: ["FLAC", "M4A"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", links: { FLAC: "#" } },
      { id: 103, title: "Buffer Overflow", duration: "2:55", specs: "24-bit / 192kHz", formats: ["FLAC", "ALAC", "M4A"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", links: { FLAC: "#" } },
    ]
  },
  {
    id: 2,
    title: "Analog Dreams",
    artist: "Retro Syntax",
    year: "2022",
    genre: "Synthwave",
    studio: "Tape Deck Records",
    cover: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=300&h=300&fit=crop",
    color: "from-orange-600",
    songs: [
      { id: 201, title: "Vinyl Scratch", duration: "3:20", specs: "24-bit / 48kHz", formats: ["ALAC", "M4A"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", links: { ALAC: "#" } },
      { id: 202, title: "Tube Amp", duration: "5:10", specs: "24-bit / 96kHz", formats: ["FLAC", "ALAC", "M4A"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", links: { FLAC: "#" } },
    ]
  },
  {
    id: 3,
    title: "Lossless Horizons",
    artist: "Bitrate Bandits",
    year: "2024",
    genre: "Ambient",
    studio: "Cloud 9 Audio",
    cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300&h=300&fit=crop",
    color: "from-cyan-600",
    songs: [
      { id: 301, title: "Crystal Clear", duration: "4:05", specs: "32-bit / 384kHz", formats: ["FLAC", "WAV", "ALAC"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", links: { FLAC: "#" } },
      { id: 302, title: "Studio Master", duration: "6:30", specs: "24-bit / 192kHz", formats: ["FLAC", "WAV", "ALAC", "M4A"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", links: { FLAC: "#" } },
    ]
  },
  {
    id: 4,
    title: "Silent Echoes",
    artist: "Void Walkers",
    year: "2021",
    genre: "Techno",
    studio: "Deep Space Mix",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
    color: "from-emerald-600",
    songs: [
      { id: 401, title: "Abyss", duration: "3:12", specs: "16-bit / 44.1kHz", formats: ["FLAC", "M4A"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", links: { FLAC: "#" } },
      { id: 402, title: "Echo Location", duration: "2:45", specs: "24-bit / 48kHz", formats: ["FLAC", "ALAC", "M4A"], previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", links: { FLAC: "#" } },
    ]
  }
];

const MOCK_CATEGORIES = [
  { id: 1, name: "Electronic", color: "bg-purple-600" },
  { id: 2, name: "Rock", color: "bg-red-600" },
  { id: 3, name: "Hip-Hop", color: "bg-orange-600" },
  { id: 4, name: "Classical", color: "bg-blue-600" },
  { id: 5, name: "Jazz", color: "bg-yellow-600" },
  { id: 6, name: "Ambient", color: "bg-teal-600" },
  { id: 7, name: "Lo-Fi", color: "bg-indigo-600" },
  { id: 8, name: "Pop", color: "bg-pink-600" },
];

const MOCK_POSTS = [
  { id: 1, title: "The Best IEMs of 2024", author: "AudioGuru", readTime: "5 min read", image: "https://images.unsplash.com/photo-1590845947698-8924d7409b56?w=400&h=200&fit=crop" },
  { id: 2, title: "Understanding Bit Depth", author: "TechSpecs", readTime: "8 min read", image: "https://images.unsplash.com/photo-1558486012-817176f84c6d?w=400&h=200&fit=crop" },
  { id: 3, title: "Vinyl vs. FLAC: The Truth", author: "AnalogSoul", readTime: "6 min read", image: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400&h=200&fit=crop" },
];

const FORMAT_DETAILS = {
  "MP3": { label: "Standard", desc: "320kbps Compressed", size: "8 MB" },
  "M4A": { label: "High", desc: "AAC 256kbps (Apple)", size: "7 MB" },
  "ALAC": { label: "Lossless", desc: "Apple Lossless Codec", size: "35 MB" },
  "FLAC": { label: "Hi-Res", desc: "Free Lossless Audio Codec", size: "45 MB" },
  "WAV":  { label: "Master", desc: "Uncompressed Raw Audio", size: "60 MB" }
};

// --- COMPONENTS ---

// MobileNav Component
const MobileNav = ({ currentView, setCurrentView, setRequestModalOpen, setUploadModalOpen, isAdmin }) => (
  <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-50 md:hidden pb-safe">
    <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center gap-1 ${currentView === 'home' ? 'text-white' : 'text-zinc-500'}`}>
      <Home size={20} />
      <span className="text-[10px] font-medium">Home</span>
    </button>
    <button onClick={() => setCurrentView('home')} className="flex flex-col items-center gap-1 text-zinc-500">
      <Library size={20} />
      <span className="text-[10px] font-medium">Library</span>
    </button>
    <button onClick={() => setRequestModalOpen(true)} className="flex flex-col items-center gap-1 text-zinc-500">
      <MessageSquarePlus size={20} />
      <span className="text-[10px] font-medium">Request</span>
    </button>
    <button onClick={() => setUploadModalOpen(true)} className={`flex flex-col items-center gap-1 ${isAdmin ? 'text-emerald-500' : 'text-zinc-500'}`}>
      <User size={20} />
      <span className="text-[10px] font-medium">{isAdmin ? 'Admin' : 'Login'}</span>
    </button>
  </div>
);

const RequestModal = ({ isOpen, onClose, onRequest }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({ 
    title: '', 
    artist: '', 
    album: '', 
    link: '', 
    quality: 'FLAC', 
    notes: '' 
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onRequest(formData);
    setFormData({ title: '', artist: '', album: '', link: '', quality: 'FLAC', notes: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#0f0f11]/95 border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] scale-100 transition-all ring-1 ring-white/5" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-white/5 to-transparent shrink-0">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
              <MessageSquarePlus className="text-fuchsia-500" size={24} /> Request a Song
            </h3>
            <p className="text-zinc-400 text-sm font-medium">Can't find a track? We'll hunt it down.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Song Title *</label>
            <input 
              required
              type="text" 
              className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all"
              placeholder="e.g. Bohemian Rhapsody"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Artist Name *</label>
              <input 
                required
                type="text" 
                className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all"
                placeholder="e.g. Queen"
                value={formData.artist}
                onChange={e => setFormData({...formData, artist: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Album (Optional)</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all"
                placeholder="e.g. A Night at the Opera"
                value={formData.album}
                onChange={e => setFormData({...formData, album: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Reference Link (YouTube/Spotify)</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3.5 text-zinc-600" size={16} />
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/5 rounded-xl p-3 pl-10 text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all"
                placeholder="https://..."
                value={formData.link}
                onChange={e => setFormData({...formData, link: e.target.value})}
              />
            </div>
          </div>

           <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Preferred Quality</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
               {['FLAC', 'ALAC', 'WAV', 'MP3 (320)'].map((q) => (
                 <button
                   key={q}
                   type="button"
                   onClick={() => setFormData({...formData, quality: q})}
                   className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${formData.quality === q ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}
                 >
                   {q}
                 </button>
               ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Additional Notes</label>
            <textarea 
              className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all resize-none h-24"
              placeholder="Specific version, release year, or anything else..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          
          <div className="pt-2 pb-2">
            <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20 transform hover:-translate-y-0.5">
              <Send size={18} /> Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UploadModal = ({ isOpen, onClose, onUpload, requests, onDeleteRequest, isAdmin, onAdminLogin }) => {
  if (!isOpen) return null;

  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('upload'); 
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const [formData, setFormData] = useState({
    title: '', artists: [], currentArtistInput: '', year: '', genre: '',
    studio: '', copyright: '', cover: null, tracks: [],
    currentSongTitle: '', currentDuration: '3:00', currentPreviewUrl: '',
    currentLyrics: '', currentLinks: { FLAC: '', ALAC: '', M4A: '', WAV: '', MP3: '' }
  });

  useEffect(() => {
    const lockoutUntil = localStorage.getItem('admin_lockout_until');
    if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) setAuthError('Access blocked.');
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const lockoutUntil = parseInt(localStorage.getItem('admin_lockout_until') || '0');
    if (lockoutUntil > Date.now()) { setAuthError('Access blocked.'); return; }
    if (password === 'Ashif@Rohit') {
      onAdminLogin(true); 
      setAuthError(''); 
      localStorage.removeItem('admin_failed_attempts'); 
      localStorage.removeItem('admin_lockout_until');
      // Save session for 24 hours
      const expiry = Date.now() + (24 * 60 * 60 * 1000);
      localStorage.setItem('admin_session', JSON.stringify({ expiry }));
    } else {
      const attempts = parseInt(localStorage.getItem('admin_failed_attempts') || '0') + 1;
      localStorage.setItem('admin_failed_attempts', attempts.toString());
      if (attempts >= 5) {
        localStorage.setItem('admin_lockout_until', (Date.now() + 172800000).toString());
        setAuthError('Blocked for 2 days.');
      } else { setAuthError(`Incorrect. ${5 - attempts} attempts left.`); }
    }
  };

  // --- AUTO-FILL HANDLER (DYNAMIC IMPORT) ---
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAutoFilling(true);
    
    try {
      // Dynamic import ensures the app doesn't crash if the library isn't installed initially.
      // This is safer for development environments.
      const mm = await import('music-metadata-browser');
      const metadata = await mm.parseBlob(file);
      const { common, format } = metadata;
      
      const title = common.title || file.name.replace(/\.[^/.]+$/, "");
      const artist = common.artist || "Unknown Artist";
      const album = common.album || "Unknown Album";
      const year = common.year || new Date().getFullYear();
      const duration = format.duration ? formatDuration(format.duration) : "3:00";
      const genre = common.genre && common.genre[0] ? common.genre[0] : "";

      setFormData(prev => ({
        ...prev,
        title: album !== "Unknown Album" ? album : title,
        artists: [artist],
        year: year,
        genre: genre,
        currentSongTitle: title,
        currentDuration: duration
      }));

      if (common.picture && common.picture.length > 0) {
        const picture = common.picture[0];
        const blob = new Blob([picture.data], { type: picture.format });
        const url = URL.createObjectURL(blob);
        setFormData(prev => ({ ...prev, cover: url }));
      }
    } catch (err) {
      console.warn("Auto-fill error. Ensure 'music-metadata-browser' and 'buffer' are installed.", err);
      // Fallback
      alert("Auto-fill failed. Please enter details manually or check if the library is installed.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleAddArtist = () => { if (formData.currentArtistInput.trim()) setFormData(prev => ({ ...prev, artists: [...prev.artists, prev.currentArtistInput.trim()], currentArtistInput: '' })); };
  const removeArtist = (index) => { setFormData(prev => ({ ...prev, artists: prev.artists.filter((_, i) => i !== index) })); };
  const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) setFormData(prev => ({ ...prev, cover: URL.createObjectURL(file) })); };
  const handleAddTrack = () => {
    if (!formData.currentSongTitle) return;
    const formats = Object.keys(formData.currentLinks).filter(key => formData.currentLinks[key].trim() !== '');
    setFormData(prev => ({
      ...prev, tracks: [...prev.tracks, { title: prev.currentSongTitle, duration: prev.currentDuration, previewUrl: prev.currentPreviewUrl, lyrics: prev.currentLyrics, links: { ...prev.currentLinks }, formats: formats.length > 0 ? formats : ['MP3'] }],
      currentSongTitle: '', currentDuration: '3:00', currentPreviewUrl: '', currentLyrics: '', currentLinks: { FLAC: '', ALAC: '', M4A: '', WAV: '', MP3: '' }
    }));
  };
  const removeTrack = (index) => { setFormData(prev => ({ ...prev, tracks: prev.tracks.filter((_, i) => i !== index) })); };
  const handleSubmit = (e) => {
    e.preventDefault(); const allTracks = [...formData.tracks];
    if (formData.currentSongTitle) {
      const formats = Object.keys(formData.currentLinks).filter(key => formData.currentLinks[key].trim() !== '');
      allTracks.push({ title: formData.currentSongTitle, duration: formData.currentDuration, previewUrl: formData.currentPreviewUrl, lyrics: formData.currentLyrics, links: { ...formData.currentLinks }, formats: formats.length > 0 ? formats : ['MP3'] });
    }
    if (allTracks.length === 0) return;
    const newAlbum = { id: Date.now(), title: formData.title, artist: formData.artists.join(', '), year: formData.year, genre: formData.genre, studio: formData.studio, copyright: formData.copyright, cover: formData.cover || "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300&h=300&fit=crop", color: "from-violet-900", songs: allTracks.map((track, index) => ({ id: Date.now() + index, title: track.title, duration: track.duration, formats: track.formats, links: track.links, lyrics: track.lyrics, previewUrl: track.previewUrl })) };
    onUpload(newAlbum); onClose();
  };

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-[#0f0f11] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-5 mb-8">
            <div className="bg-violet-500/10 p-5 rounded-full ring-1 ring-violet-500/20"><Lock className="text-violet-400" size={32} /></div>
            <div className="text-center"><h3 className="text-2xl font-bold text-white mb-1">Creator Studio</h3><p className="text-zinc-400 text-sm">Secure access point for admins.</p></div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" autoFocus className={`w-full bg-white/5 border ${authError ? 'border-red-500/50' : 'border-white/10'} rounded-xl p-3 text-white text-center tracking-widest focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all`} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            {authError && <p className="text-red-400 text-xs text-center font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors mt-2 shadow-lg">Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#0f0f11] border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0 bg-white/[0.02]">
           <div className="flex items-center gap-4">
             <button onClick={() => setActiveTab('upload')} className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'upload' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}>Upload Music</button>
             <button onClick={() => setActiveTab('requests')} className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}>Audience Requests {requests.length > 0 && <span className="bg-fuchsia-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{requests.length}</span>}</button>
           </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {activeTab === 'requests' ? (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 flex flex-col items-center gap-3"><Inbox size={48} className="opacity-20" /><p>No pending requests.</p></div>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-start justify-between hover:bg-white/10 transition-colors group">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3 mb-2"><span className="text-lg font-bold text-white">{req.title}</span><span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-500/30 font-bold">{req.quality}</span></div>
                      <div className="text-sm text-zinc-400 font-medium mb-1">Artist: <span className="text-zinc-200">{req.artist}</span></div>
                      {req.album && <div className="text-sm text-zinc-400 font-medium mb-1">Album: <span className="text-zinc-200">{req.album}</span></div>}
                      {req.notes && <div className="text-sm text-zinc-500 mt-3 p-3 bg-black/20 rounded-lg italic border border-white/5">"{req.notes}"</div>}
                      {req.link && (<a href={req.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-emerald-400 mt-3 hover:underline font-bold"><LinkIcon size={12} /> Reference Link</a>)}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => onDeleteRequest(req.id)} className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Delete Request"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* MAGIC AUTO-FILL SECTION */}
              <div className="bg-gradient-to-r from-violet-900/40 to-fuchsia-900/40 p-1 rounded-2xl border border-white/10 mb-6">
                <div className="bg-[#18181b] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-full"><FileAudio size={24} className="text-fuchsia-400" /></div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Auto-Fill Metadata</h4>
                      <p className="text-xs text-zinc-400">Drop an MP3, FLAC, or WAV file to instantly fill details.</p>
                    </div>
                  </div>
                  <div className="relative">
                     {/* Updated accept attribute for all formats */}
                     <input type="file" accept=".mp3,.wav,.flac,.m4a,.alac,.aac,.ogg,audio/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                     <button type="button" className="bg-white text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2">
                        {isAutoFilling ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} 
                        {isAutoFilling ? 'Scanning...' : 'Select File'}
                     </button>
                  </div>
                </div>
              </div>

              {/* Metadata Section */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Disc size={14}/> Album Metadata</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</label><input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/50 focus:outline-none transition-colors" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Neon Nights" /></div>
                  <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cover Art</label><div className="flex gap-3"><input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/50 focus:outline-none transition-colors" placeholder="Image URL..." value={formData.cover || ''} onChange={e => setFormData({...formData, cover: e.target.value})} /><div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shrink-0">{formData.cover ? <img src={formData.cover} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="text-zinc-600"/>}</div></div></div>
                </div>
                {/* ... other form fields ... */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                   <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Year</label><input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/50 focus:outline-none" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} /></div>
                   <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Genre</label><input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/50 focus:outline-none" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} /></div>
                   <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Artist</label><div className="flex gap-2"><input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/50 focus:outline-none" value={formData.currentArtistInput} onChange={e => setFormData({...formData, currentArtistInput: e.target.value})} placeholder="Name" /><button type="button" onClick={handleAddArtist} className="bg-white/5 border border-white/10 px-3 rounded-xl hover:bg-white/10"><Plus size={18} className="text-zinc-300"/></button></div></div>
                </div>
                <div className="flex flex-wrap gap-2">{formData.artists.map((artist, i) => (<span key={i} className="bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">{artist} <button type="button" onClick={() => removeArtist(i)} className="hover:text-white"><X size={12}/></button></span>))}</div>
              </div>
              <hr className="border-white/5" />
              {/* Track Section */}
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Music size={14}/> Track Management</h4>
                {formData.tracks.length > 0 && (<div className="space-y-2 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">{formData.tracks.map((t, i) => (<div key={i} className="flex justify-between items-center text-sm py-1"><span className="text-zinc-300 flex items-center gap-3"><span className="text-zinc-600 font-mono text-xs">{i+1}</span> {t.title}</span><div className="flex items-center gap-4"><div className="flex gap-1">{t.formats.map(f => <span key={f} className="text-[9px] bg-black/30 px-2 py-0.5 rounded-full text-zinc-400 border border-white/5">{f}</span>)}</div><button type="button" onClick={() => removeTrack(i)} className="text-zinc-600 hover:text-red-400"><Trash2 size={14}/></button></div></div>))}</div>)}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                   <div className="col-span-1 sm:col-span-3 space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Track Title</label><input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/50 focus:outline-none" value={formData.currentSongTitle} onChange={e => setFormData({...formData, currentSongTitle: e.target.value})} placeholder="Song Name" /></div>
                   <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time</label><input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-violet-500/50 focus:outline-none" value={formData.currentDuration} onChange={e => setFormData({...formData, currentDuration: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cloud Links (Optional)</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Object.keys(formData.currentLinks).map(fmt => (<div key={fmt} className="flex items-center gap-2"><div className="w-12 text-[10px] font-bold text-center bg-white/5 py-2 rounded-lg text-zinc-400 border border-white/5">{fmt}</div><input type="text" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-violet-500/50 focus:outline-none" placeholder="Link..." value={formData.currentLinks[fmt]} onChange={e => setFormData(prev => ({...prev, currentLinks: {...prev.currentLinks, [fmt]: e.target.value}}))} /></div>))}</div></div>
                <div className="flex justify-end pt-2"><button type="button" onClick={handleAddTrack} disabled={!formData.currentSongTitle} className="bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/5">+ Add to Queue</button></div>
              </div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl text-zinc-400 font-bold hover:bg-white/5 transition-colors">Cancel</button><button type="submit" className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all shadow-lg shadow-violet-500/20 transform hover:-translate-y-0.5">Publish Release</button></div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ... (AIModal & DownloadModal reuse existing)
const AIModal = ({ isOpen, onClose, title, content, isLoading, type }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#1a1a1a] to-[#121212]">
          <div className="flex justify-between items-start mb-3"><div className="flex items-center gap-2 text-violet-400">{type === 'liner' ? <Sparkles size={18} /> : <Cpu size={18} />}<span className="text-xs font-bold tracking-widest uppercase">Gemini Audio Engine</span></div><button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button></div>
          <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar bg-[#121212]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-zinc-500"><Loader2 size={32} className="animate-spin text-violet-500" /><p className="text-sm font-mono animate-pulse">Analyzing audio frequencies...</p></div>
          ) : ( <div className="prose prose-invert prose-sm max-w-none"><div className="whitespace-pre-wrap font-light leading-relaxed text-zinc-300 text-base">{content}</div></div> )}
        </div>
        <div className="p-4 bg-black/40 border-t border-white/5 text-center text-[10px] text-zinc-600 uppercase tracking-widest flex items-center justify-center gap-2"><Sparkles size={10} /> Powered by Google Gemini</div>
      </div>
    </div>
  );
};

const DownloadModal = ({ isOpen, onClose, song, onDownload }) => {
  if (!isOpen || !song) return null;
  const handleFormatClick = (fmt) => { if (song.links && song.links[fmt]) { window.open(song.links[fmt], '_blank'); onDownload(fmt); } else { onDownload(fmt); } };
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f0f11]/95 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/5">
        <div className="p-6 border-b border-white/5 flex justify-between items-start"><div><h3 className="text-xl font-bold text-white mb-1">Download</h3><p className="text-zinc-400 text-sm">Select format for <span className="text-violet-400">{song.title}</span></p></div><button onClick={onClose} className="text-zinc-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X size={20} /></button></div>
        <div className="p-4 space-y-2.5 bg-[#121212]">
          {song.formats.map((fmt) => {
            const hasLink = song.links && song.links[fmt] && song.links[fmt] !== '#';
            const isLossless = ['FLAC', 'ALAC', 'WAV'].includes(fmt);
            return (
              <button key={fmt} onClick={() => handleFormatClick(fmt)} className="w-full group flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all border border-white/5 hover:border-white/10 hover:shadow-lg">
                <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner border ${isLossless ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-zinc-800/50 text-zinc-400 border-white/5'}`}>{fmt}</div><div className="text-left"><div className="text-white font-semibold flex items-center gap-2">{FORMAT_DETAILS[fmt]?.label || fmt}{isLossless && (<span className="text-[9px] bg-violet-500/20 text-violet-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Lossless</span>)}</div><div className="text-zinc-500 text-xs mt-1 font-medium">{hasLink ? <span className="text-green-400 flex items-center gap-1"><LinkIcon size={10}/> External Link</span> : FORMAT_DETAILS[fmt]?.desc}</div></div></div><div className="text-zinc-500 group-hover:text-white transition-colors">{hasLink ? <Download size={20} /> : <span className="text-xs font-mono opacity-50">{FORMAT_DETAILS[fmt]?.size}</span>}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [albums, setAlbums] = useState(INITIAL_ALBUMS);
  const [dbAlbums, setDbAlbums] = useState([]); // Store albums from Firestore
  const [currentView, setCurrentView] = useState('home');
  const [selectedAlbum, setSelectedAlbum] = useState(albums[0]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloadModalData, setDownloadModalData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiType, setAiType] = useState('liner');
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [playQueue, setPlayQueue] = useState([]);
  const [currentAlbumDetails, setCurrentAlbumDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); 
  const [requests, setRequests] = useState([]); 

  // --- DATABASE SYNC: Listeners ---
  useEffect(() => {
    // 1. Check Session
    const session = localStorage.getItem('admin_session');
    if (session) {
      const { expiry } = JSON.parse(session);
      if (Date.now() < expiry) setIsAdmin(true);
    }
    
    // 2. SAFETY CHECK: Ensure db is initialized before trying to sync
    if (!db) {
       console.error("Firebase DB not initialized. Check firebase.js keys.");
       return;
    }

    // 3. Requests Listener
    const unsubRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
       const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setRequests(reqs);
    }, (error) => console.warn("Requests sync error:", error));

    // 4. Albums Listener
    const unsubAlbums = onSnapshot(collection(db, "albums"), (snapshot) => {
      const fetchedAlbums = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDbAlbums(fetchedAlbums);
    }, (error) => console.warn("Albums sync error:", error));

    return () => {
      unsubRequests();
      unsubAlbums();
    };
  }, []);

  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const volumeBarRef = useRef(null);

  const getFilteredAlbums = () => {
    const allAlbums = [...dbAlbums, ...INITIAL_ALBUMS]; // Combine local and DB albums
    if (!searchQuery) return allAlbums;
    return allAlbums.filter(album => album.title.toLowerCase().includes(searchQuery.toLowerCase()) || album.artist.toLowerCase().includes(searchQuery.toLowerCase()) || album.songs.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())));
  };

  const handlePlay = (song, album) => {
    if (currentSong?.id !== song.id) { setPlayQueue(album.songs); setCurrentAlbumDetails({ cover: album.cover, artist: album.artist }); setCurrentSong({ ...song, albumArt: album.cover, artist: album.artist }); setIsPlaying(true); setProgress(0); } else { setIsPlaying(!isPlaying); }
  };
  const handleNext = () => {
    if (!currentSong || playQueue.length === 0) return;
    if (repeatMode === 2) { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } return; }
    let nextIndex;
    if (isShuffle) { nextIndex = Math.floor(Math.random() * playQueue.length); } else { const currentIndex = playQueue.findIndex(s => s.id === currentSong.id); nextIndex = (currentIndex + 1) % playQueue.length; }
    const nextSong = playQueue[nextIndex];
    if (nextSong && currentAlbumDetails) { setCurrentSong({ ...nextSong, albumArt: currentAlbumDetails.cover, artist: currentAlbumDetails.artist }); setIsPlaying(true); }
  };
  const handlePrevious = () => {
    if (!currentSong || playQueue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const currentIndex = playQueue.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + playQueue.length) % playQueue.length;
    const prevSong = playQueue[prevIndex];
    if (prevSong && currentAlbumDetails) { setCurrentSong({ ...prevSong, albumArt: currentAlbumDetails.cover, artist: currentAlbumDetails.artist }); setIsPlaying(true); }
  };
  const handleClosePlayer = () => { setIsPlaying(false); setCurrentSong(null); if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } };
  const handleTimeUpdate = () => {
    if (audioRef.current) {
        const current = audioRef.current.currentTime;
        const PREVIEW_LIMIT = 30;
        if (current >= PREVIEW_LIMIT) {
            audioRef.current.pause(); audioRef.current.currentTime = 0; setIsPlaying(false); setProgress(0);
            const id = Date.now(); setNotifications(prev => [...prev, { id, title: "Preview Ended", subtitle: "Download for full track.", status: 'success' }]); setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000); return;
        }
        setProgress((current / PREVIEW_LIMIT) * 100);
    }
  };
  const handleSeek = (e) => {
    if (!progressBarRef.current || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect(); const clickX = e.clientX - rect.left; const width = rect.width; const PREVIEW_LIMIT = 30; const newTime = (clickX / width) * PREVIEW_LIMIT;
    if (isFinite(newTime)) { audioRef.current.currentTime = newTime; setProgress((clickX / width) * 100); }
  };
  const handleVolumeChange = (e) => {
    if (!volumeBarRef.current || !audioRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect(); const clickX = e.clientX - rect.left; const width = rect.width; const newVolume = Math.min(Math.max(clickX / width, 0), 1);
    audioRef.current.volume = newVolume; setVolume(newVolume);
  };

  useEffect(() => {
    if (currentSong && audioRef.current) { audioRef.current.volume = volume; if (isPlaying) { audioRef.current.play().catch(e => console.error("Audio error:", e)); } else { audioRef.current.pause(); } }
  }, [isPlaying, currentSong]);

  const handleDownloadClick = (song) => { setDownloadModalData(song); };
  const performDownload = (format) => { const id = Date.now(); setNotifications(prev => [...prev, { id, title: `Opening Download...`, subtitle: `${format} • Checking Link`, status: 'success' }]); setDownloadModalData(null); setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 4000); };
  
  const handleUpload = async (newAlbum) => { 
    try {
      if (!db) { console.error("Database not connected"); return; }
      await addDoc(collection(db, "albums"), { ...newAlbum, createdAt: new Date() });
      const id = Date.now(); setNotifications(prev => [...prev, { id, title: "Release Published", subtitle: `${newAlbum.title} is live`, status: 'success' }]); setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000); 
    } catch (e) { console.error("Upload failed", e); }
  };
  
  const handleRequestSong = async (data) => { 
    try {
      if (db) {
          await addDoc(collection(db, "requests"), { ...data, timestamp: new Date() });
      }
      // Local feedback for immediate response even if DB is slow/offline
      const id = Date.now(); setNotifications(prev => [...prev, { id, title: "Request Sent", subtitle: "Saved to database!", status: 'success' }]); setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000); 
    } catch (e) { console.error("Request failed", e); }
  };

  const handleDeleteRequest = async (reqId) => {
     try {
       if (db) await deleteDoc(doc(db, "requests", reqId));
       // Optimistic UI update handled by listener, but we show toast
       const id = Date.now(); setNotifications(prev => [...prev, { id, title: "Request Deleted", subtitle: "Removed from database.", status: 'success' }]); setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
     } catch (e) { console.error("Delete failed", e); }
  };

  const handleDeleteAlbum = (albumId) => { if (window.confirm("Delete album?")) { setAlbums(prev => prev.filter(a => a.id !== albumId)); setCurrentView('home'); const id = Date.now(); setNotifications(prev => [...prev, { id, title: "Album Deleted", subtitle: "Removed from library.", status: 'success' }]); setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000); } };
  const handleDeleteSong = (e, songId) => { e.stopPropagation(); if (window.confirm("Delete song?")) { const updatedSongs = selectedAlbum.songs.filter(s => s.id !== songId); const updatedAlbum = { ...selectedAlbum, songs: updatedSongs }; setSelectedAlbum(updatedAlbum); setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? updatedAlbum : a)); if (currentSong?.id === songId) { setIsPlaying(false); setCurrentSong(null); } } };
  const generateLinerNotes = async (album) => { setAiTitle(`Liner Notes: ${album.title}`); setAiType('liner'); setAiContent(''); setAiModalOpen(true); setAiLoading(true); const prompt = `Write sophisticated liner notes for "${album.title}" by "${album.artist}". Genre: "${album.genre || 'Audiophile'}". Tone: Professional Music Critic.`; const text = await callGemini(prompt); setAiContent(text); setAiLoading(false); };
  const generateSonicAnalysis = async (song, albumName) => { setAiTitle(`Sonic Analysis: ${song.title}`); setAiType('sonic'); setAiContent(''); setAiModalOpen(true); setAiLoading(true); const prompt = `Technical audio analysis of "${song.title}" from "${albumName}". Focus on mastering, dynamic range, and frequency response.`; const text = await callGemini(prompt); setAiContent(text); setAiLoading(false); };
  const Greeting = () => { const hour = new Date().getHours(); if (hour < 12) return "Good morning"; if (hour < 18) return "Good afternoon"; return "Good evening"; };

  // --- MOBILE NAV COMPONENT ---
  const MobileNav = () => (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-50 md:hidden pb-safe">
      <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center gap-1 ${currentView === 'home' ? 'text-white' : 'text-zinc-500'}`}>
        <Home size={20} />
        <span className="text-[10px] font-medium">Home</span>
      </button>
      <button onClick={() => setCurrentView('home')} className="flex flex-col items-center gap-1 text-zinc-500">
        <Library size={20} />
        <span className="text-[10px] font-medium">Library</span>
      </button>
      <button onClick={() => setRequestModalOpen(true)} className="flex flex-col items-center gap-1 text-zinc-500">
        <MessageSquarePlus size={20} />
        <span className="text-[10px] font-medium">Request</span>
      </button>
      <button onClick={() => setUploadModalOpen(true)} className={`flex flex-col items-center gap-1 ${isAdmin ? 'text-emerald-500' : 'text-zinc-500'}`}>
        <User size={20} />
        <span className="text-[10px] font-medium">{isAdmin ? 'Admin' : 'Login'}</span>
      </button>
    </div>
  );

  const renderContent = () => {
    if (currentView === 'album') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          {/* ALBUM HEADER */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-end mb-8 md:mb-10 p-6 md:p-8 rounded-[32px] bg-gradient-to-b from-white/5 to-transparent border border-white/5">
            <img src={selectedAlbum.cover} className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-2xl shadow-black/50 self-center md:self-auto" />
            <div className="flex flex-col gap-3 md:gap-4 w-full text-center md:text-left">
              <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">Album</span>
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white tracking-tight leading-none">{selectedAlbum.title}</h1>
              <div className="flex items-center justify-center md:justify-start gap-3 text-sm font-medium text-zinc-300 mt-2 flex-wrap">
                <img src={selectedAlbum.cover} className="w-6 h-6 rounded-full" />
                <span className="text-white">{selectedAlbum.artist}</span>
                <span className="w-1 h-1 bg-zinc-500 rounded-full" />
                <span>{selectedAlbum.year}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] rounded-[32px] border border-white/5 p-2">
            <div className="px-4 md:px-6 py-4 flex items-center gap-4 border-b border-white/5 mb-2 overflow-x-auto no-scrollbar">
              <button onClick={() => handlePlay(selectedAlbum.songs[0], selectedAlbum)} className="bg-fuchsia-500 text-white p-3 md:p-4 rounded-full hover:scale-105 transition-transform shadow-lg shadow-fuchsia-500/20 shrink-0">
                {isPlaying && currentSong?.albumArt === selectedAlbum.cover ? <Pause fill="white" size={20} /> : <Play fill="white" className="ml-1" size={20} />}
              </button>
              <button className="p-3 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-colors shrink-0"><Heart size={20} /></button>
              {isAdmin && <button onClick={() => handleDeleteAlbum(selectedAlbum.id)} className="p-3 rounded-full border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-400 transition-colors shrink-0"><Trash2 size={20} /></button>}
              <div className="ml-auto"><button onClick={() => generateLinerNotes(selectedAlbum)} className="text-xs font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-zinc-300 transition-colors border border-white/5 flex items-center gap-2 whitespace-nowrap"><Sparkles size={14} className="text-fuchsia-400" /> AI Insight</button></div>
            </div>

            <div className="flex flex-col">
              {selectedAlbum.songs.map((song, idx) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div key={song.id} onClick={() => handlePlay(song, selectedAlbum)} className={`flex items-center gap-4 px-4 md:px-6 py-3 md:py-4 rounded-xl cursor-pointer group transition-colors ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <span className="text-sm text-zinc-500 font-mono w-6 text-center">{isCurrent && isPlaying ? <Activity size={16} className="text-fuchsia-500 animate-pulse" /> : idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm md:text-base truncate ${isCurrent ? 'text-fuchsia-400' : 'text-white'}`}>{song.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{song.artist}</div>
                    </div>
                    <div className="hidden md:flex gap-2">
                      {song.specs && <span className="text-[10px] border border-white/10 px-2 py-0.5 rounded text-zinc-400 bg-black/20">{song.specs}</span>}
                    </div>
                    <span className="text-xs md:text-sm text-zinc-500 font-mono">{song.duration}</span>
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleDownloadClick(song) }} className="text-zinc-400 hover:text-white"><Download size={18} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // HOME VIEW
    const filtered = getFilteredAlbums();
    return (
      <div className="space-y-8 md:space-y-12">
        {!searchQuery && (
          <div className="relative w-full min-h-[300px] md:min-h-[400px] rounded-[24px] md:rounded-[32px] overflow-hidden group shadow-2xl flex flex-col md:flex-row items-end">
            <img src="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=1200&h=600&fit=crop" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
            <div className="relative z-10 p-6 md:p-10 max-w-3xl w-full">
              <span className="inline-block px-3 py-1 bg-violet-500/20 text-violet-200 text-[10px] font-bold uppercase tracking-widest rounded-full border border-violet-500/20 mb-4 backdrop-blur-md">Featured Master</span>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight leading-tight">Lossless Horizons</h1>
              <p className="text-zinc-300 text-sm md:text-lg mb-6 md:mb-8 font-light leading-relaxed max-w-xl">Dive into a soundscape where every detail matters.</p>
              <div className="flex gap-4">
                <button onClick={() => { setSelectedAlbum(albums[2]); setCurrentView('album'); }} className="bg-white text-black px-6 md:px-8 py-3 md:py-3.5 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-200 transition-transform hover:scale-105 shadow-xl shadow-white/10 text-sm md:text-base">
                  <Play size={20} fill="black" /> Play Now
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
            {searchQuery ? `Searching: "${searchQuery}"` : "Fresh Releases"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {getFilteredAlbums().map(album => (
              <div key={album.id} onClick={() => { setSelectedAlbum(album); setCurrentView('album'); }} className="bg-white/5 p-3 md:p-5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-white/10 hover:-translate-y-1 duration-300">
                <div className="relative aspect-square mb-3 md:mb-4 rounded-xl overflow-hidden shadow-lg">
                  <img src={album.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="font-bold text-white text-sm md:text-base mb-1 truncate">{album.title}</h3>
                <p className="text-xs md:text-sm text-zinc-400 truncate">{album.artist}</p>
              </div>
            ))}
          </div>
        </div>

        {!searchQuery && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Browse Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MOCK_CATEGORIES.slice(0, 4).map(cat => (
                <div key={cat.id} className={`${cat.color} h-24 md:h-32 rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform border border-white/5`}>
                  <span className="font-bold text-lg md:text-xl z-10 relative break-words">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-[#09090b] text-white flex overflow-hidden font-sans selection:bg-fuchsia-500/30 selection:text-fuchsia-200">
      
      {/* GLOBAL CSS */}
      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        .mask-linear-gradient { mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent); }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>

      {/* SIDEBAR (Desktop) */}
      <div className={`w-72 flex flex-col p-4 gap-4 hidden md:flex shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-xl ${currentSong ? 'pb-36' : 'pb-4'}`}>
        {/* Fixed Header */}
        <div className="px-4 pt-2 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 rotate-3">
            <Disc className="text-white" size={22} />
          </div>
          <span className="text-xl font-black tracking-tight text-white">AudioPhile</span>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Discover</p>
            <button onClick={() => setCurrentView('home')} className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentView === 'home' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
              <Home size={18} /> Home
            </button>
            {/* Search Link Restored for Desktop Sidebar */}
            <button className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
              <Search size={18} /> Search
            </button>
            <button className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
              <TrendingUp size={18} /> Trending
            </button>
          </div>

          <div className="flex flex-col gap-1">
             <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Your Library</p>
             <button className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
               <Library size={18} /> Albums
             </button>
             <button onClick={() => setRequestModalOpen(true)} className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
               <MessageSquarePlus size={18} /> Request Song
             </button>
          </div>
        </div>

        {/* Fixed Bottom Footer */}
        <div className="mt-auto shrink-0 pt-4 border-t border-white/5">
          <button onClick={() => setUploadModalOpen(true)} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all group ${isAdmin ? 'bg-gradient-to-r from-violet-900/20 to-fuchsia-900/20 border-violet-500/30 text-violet-200' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isAdmin ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                 <UploadCloud size={16} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold">{isAdmin ? "Creator Mode" : "Admin Access"}</span>
                <span className="text-[10px] opacity-60">{isAdmin ? "Active" : "Locked"}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <MobileNav />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#09090b]">
         {/* Ambient Background Glow */}
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/10 rounded-full blur-[120px] pointer-events-none" />

         {/* Header */}
         <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 z-20 backdrop-blur-sm sticky top-0 border-b border-white/5">
           <div className="flex gap-3 hidden md:flex">
             <button className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"><ChevronRight className="rotate-180" size={20}/></button>
             <button className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"><ChevronRight size={20}/></button>
           </div>
           
           {/* Mobile Logo */}
           <div className="md:hidden flex items-center gap-2 mr-4">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-lg">
                 <Disc className="text-white" size={18} />
              </div>
           </div>

           {/* Search Bar */}
           <div className="flex-1 max-w-lg mx-0 md:mx-8 relative group">
             <div className="relative">
               <Search className="absolute left-4 top-2.5 md:top-3 text-zinc-500 group-focus-within:text-violet-400 transition-colors" size={18} />
               <input 
                 type="text" 
                 className="w-full bg-[#121214] border border-white/10 rounded-full py-2 md:py-2.5 pl-12 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all shadow-inner"
                 placeholder="Search for artists, songs, or albums..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
           </div>
           <div className="w-8 hidden md:block"></div>
         </header>

         {/* Scrollable Content */}
         <div className={`flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-4 relative z-10 ${currentSong ? 'pb-40' : 'pb-24 md:pb-8'}`}>
            {renderContent()}
         </div>
      </div>

      {/* AUDIO PLAYER */}
      <audio ref={audioRef} src={getDirectUrl(currentSong?.previewUrl)} onTimeUpdate={handleTimeUpdate} onEnded={() => {if(playQueue.length>0) handleNext(); else setIsPlaying(false)}} />

      {currentSong && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[90%] max-w-screen-xl h-20 md:h-24 bg-[#121212]/90 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-[32px] flex items-center justify-between px-4 md:px-8 z-[60] shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-24 duration-500 ring-1 ring-white/5">
           
           <div className="flex items-center gap-3 md:gap-5 w-[60%] md:w-[30%]">
              <img src={currentSong.albumArt} className="h-10 w-10 md:h-14 md:w-14 rounded-lg shadow-lg" />
              <div className="flex flex-col overflow-hidden">
                 <span className="font-bold text-white text-xs md:text-sm truncate">{currentSong.title}</span>
                 <span className="text-[10px] md:text-xs text-zinc-400 truncate">{currentSong.artist}</span>
              </div>
           </div>

           <div className="flex flex-col items-center justify-center gap-1 flex-1 max-w-md hidden md:flex">
              <div className="h-6 w-full overflow-hidden relative flex items-center justify-center">
                  <span className="text-xs font-medium text-fuchsia-300 text-center truncate px-4">
                    {MOCK_LYRICS[Math.floor((progress/100) * MOCK_LYRICS.length)]}
                  </span>
              </div>
              <div className="flex items-center gap-6 w-full">
                 <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{audioRef.current ? Math.floor(audioRef.current.currentTime/60)+":"+(Math.floor(audioRef.current.currentTime%60)).toString().padStart(2,'0') : "0:00"}</span>
                 <div ref={progressBarRef} className="h-1.5 flex-1 bg-zinc-800 rounded-full cursor-pointer relative group" onClick={handleSeek}>
                    <div className="absolute h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{width: `${progress}%`}}>
                       <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </div>
                 </div>
                 <span className="text-[10px] text-zinc-500 font-mono w-8">0:30</span>
              </div>
           </div>

           <div className="flex items-center justify-end gap-4 md:gap-6 w-[40%] md:w-[30%]">
              <div className="flex items-center gap-3">
                 <button onClick={handlePrevious} className="text-zinc-400 hover:text-white transition-colors hidden md:block"><SkipBack size={20} fill="currentColor"/></button>
                 <button onClick={() => setIsPlaying(!isPlaying)} className="bg-white text-black p-2 md:p-3 rounded-full hover:scale-110 transition-transform shadow-lg shadow-white/20">
                    {isPlaying ? <Pause size={18} fill="black"/> : <Play size={18} fill="black" className="ml-1"/>}
                 </button>
                 <button onClick={handleNext} className="text-zinc-400 hover:text-white transition-colors"><SkipForward size={20} fill="currentColor"/></button>
              </div>
              <div className="h-8 w-px bg-white/10 hidden md:block"/>
              <button onClick={handleClosePlayer} className="text-zinc-500 hover:text-white ml-2"><X size={18}/></button>
           </div>
        </div>
      )}

      {/* MODALS */}
      <RequestModal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} onRequest={handleRequestSong} />
      <DownloadModal isOpen={!!downloadModalData} onClose={() => setDownloadModalData(null)} song={downloadModalData} onDownload={performDownload} />
      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUpload={handleUpload} requests={requests} onDeleteRequest={handleDeleteRequest} isAdmin={isAdmin} onAdminLogin={setIsAdmin} />
      <AIModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title={aiTitle} content={aiContent} isLoading={aiLoading} type={aiType} />

      {/* TOASTS */}
      <div className="fixed bottom-40 right-8 flex flex-col gap-2 pointer-events-none z-[60]">
        {notifications.map(n => (
          <div key={n.id} className="bg-[#121212]/90 border border-emerald-500/20 p-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right fade-in duration-300">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full"><Check size={20} /></div>
            <div><div className="font-bold text-sm text-white">{n.title}</div><div className="text-xs text-zinc-400">{n.subtitle}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- HELPER ---
function FormatBadge({ text, color }) { return <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider border border-white/5 bg-black/30 text-zinc-400`}>{text}</span>; }
function Badge({ text }) { return null; }