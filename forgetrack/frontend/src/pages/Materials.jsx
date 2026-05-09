import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PlusCircle, FileText, Video, Link as LinkIcon, BookOpen, Clock, ArrowUpRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '../contexts/AuthContext';

export const Materials = () => {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newSessionId, setNewSessionId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('slides');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.from('sessions').select('*').order('date', { ascending: false });
      setSessions(sessionData || []);
      const { data: materialData } = await supabase.from('materials').select('*, sessions ( date, topic, month_number )').order('created_at', { ascending: false });
      setMaterials(materialData || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await supabase.from('materials').insert({ session_id: newSessionId, title: newTitle, type: newType, url: newUrl });
      setIsModalOpen(false); setNewTitle(''); setNewUrl('');
      fetchMaterials();
    } finally {
      setAdding(false);
    }
  };

  const filteredMaterials = selectedMonth === 'all' ? materials : materials.filter(m => m.sessions?.month_number.toString() === selectedMonth);
  const materialsBySession = filteredMaterials.reduce((acc, curr) => {
    const sId = curr.session_id;
    if (!acc[sId]) acc[sId] = { session: curr.sessions, items: [] };
    acc[sId].items.push(curr);
    return acc;
  }, {});

  const getIconForType = (type) => {
    switch(type) {
      case 'slides': return <FileText className="w-5 h-5 text-accent-cyan" />;
      case 'recording': return <Video className="w-5 h-5 text-danger" />;
      case 'document': return <BookOpen className="w-5 h-5 text-warning" />;
      default: return <LinkIcon className="w-5 h-5 text-accent-primary" />;
    }
  };

  const getBgForType = (type) => {
    switch(type) {
      case 'slides': return 'bg-accent-cyan/10';
      case 'recording': return 'bg-danger/10';
      case 'document': return 'bg-warning/10';
      default: return 'bg-accent-primary/10';
    }
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h1 className="text-6xl md:text-7xl font-display font-medium tracking-tight text-white mb-2">Class Materials</h1>
          <p className="text-lg text-fg-secondary font-medium">Curated resources and session documentation.</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="btn-secondary w-[200px] border-none">
              <SelectValue placeholder="Filter Timeline" />
            </SelectTrigger>
            <SelectContent className="bg-[#11131C] border-white/10 shadow-2xl rounded-lg">
              <SelectItem value="all">Entire Program</SelectItem>
              <SelectItem value="4">Cycle 04</SelectItem>
              <SelectItem value="5">Cycle 05</SelectItem>
              <SelectItem value="6">Cycle 06</SelectItem>
            </SelectContent>
          </Select>

          {profile?.role === 'mentor' && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <button className="btn-primary flex items-center gap-2 px-8">
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Post Material</span>
                </button>
              </DialogTrigger>
              <DialogContent className="aura-card border-none max-w-xl p-10 animate-in zoom-in duration-300">
                <DialogHeader><DialogTitle className="text-3xl font-display font-medium text-white mb-8">New Educational Asset</DialogTitle></DialogHeader>
                <form onSubmit={handleAddMaterial} className="space-y-8">
                  <div className="space-y-3"><label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Target Session</label>
                    <Select value={newSessionId} onValueChange={setNewSessionId} required><SelectTrigger className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-lg text-white font-medium"><SelectValue placeholder="Select live session" /></SelectTrigger><SelectContent className="bg-[#11131C] border-white/10 shadow-2xl rounded-lg max-h-[300px]">{sessions.map(s => (<SelectItem key={s.id} value={s.id.toString()}>{format(new Date(s.date), 'MMM d')} — {s.topic}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <div className="space-y-3"><label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Asset Title</label><input type="text" className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 text-white font-medium" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. System Design Cheat Sheet" required /></div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3"><label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Asset Type</label><Select value={newType} onValueChange={setNewType} required><SelectTrigger className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-lg text-white font-medium"><SelectValue placeholder="Format" /></SelectTrigger><SelectContent className="bg-[#11131C] border-white/10 shadow-2xl rounded-lg"><SelectItem value="slides">Slides Deck</SelectItem><SelectItem value="recording">Video Stream</SelectItem><SelectItem value="document">Technical Doc</SelectItem><SelectItem value="link">External Link</SelectItem></SelectContent></Select></div>
                    <div className="space-y-3"><label className="text-[11px] font-bold tracking-widest text-fg-tertiary uppercase">Resource URL</label><input type="url" className="w-full px-6 h-14 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:border-accent-primary/30 text-white font-medium" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." required /></div>
                  </div>
                  <button type="submit" disabled={adding} className="btn-primary w-full h-16 mt-4 text-lg font-bold">{adding ? 'Sequencing...' : 'Authorize Asset'}</button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center opacity-40 animate-pulse font-bold uppercase tracking-widest">Scanning Repository...</div>
      ) : Object.keys(materialsBySession).length === 0 ? (
        <div className="aura-card p-20 text-center flex flex-col items-center gap-6 opacity-40">
          <BookOpen className="w-16 h-16" />
          <p className="text-xl font-display font-medium">No assets found in this sector.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.values(materialsBySession)
            .sort((a, b) => new Date(b.session.date) - new Date(a.session.date))
            .map(({ session, items }) => (
            <div key={session.id} className="aura-card p-0 overflow-hidden group hover:border-accent-primary/20">
              <div className="p-10 border-b border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="px-3 py-1 rounded-lg bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-black uppercase tracking-widest">
                    Cycle {session.month_number}
                  </div>
                  <div className="text-[10px] font-bold tracking-widest text-fg-tertiary uppercase opacity-60">
                    {format(new Date(session.date), 'MMM d, yyyy')}
                  </div>
                </div>
                <h3 className="text-2xl font-display font-medium text-white group-hover:text-accent-primary transition-colors relative z-10">{session.topic}</h3>
              </div>
              <div className="p-8 space-y-4">
                {items.map(item => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group/item">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover/item:scale-110 ${getBgForType(item.type)}`}>
                        {getIconForType(item.type)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white mb-1 group-hover/item:text-accent-cyan transition-colors">{item.title}</div>
                        <div className="text-[10px] font-bold text-fg-tertiary uppercase tracking-widest opacity-60">{item.type}</div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/5 group-hover/item:text-white/30 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
