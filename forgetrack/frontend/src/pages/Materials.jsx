import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PlusCircle, FileText, Video, Link as LinkIcon, BookOpen } from 'lucide-react';
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

export const Materials = () => {
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New material form
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
      // Fetch all sessions (we need them for the dropdown anyway)
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });
        
      setSessions(sessionData || []);

      // Fetch materials
      const { data: materialData } = await supabase
        .from('materials')
        .select(`
          *,
          sessions ( date, topic, month_number )
        `)
        .order('created_at', { ascending: false });

      setMaterials(materialData || []);
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { error } = await supabase
        .from('materials')
        .insert({
          session_id: newSessionId,
          title: newTitle,
          type: newType,
          url: newUrl
        });

      if (error) throw error;
      
      setIsModalOpen(false);
      setNewTitle('');
      setNewUrl('');
      // Refresh list
      fetchMaterials();
    } catch (err) {
      console.error('Error adding material:', err);
      alert('Failed to add material');
    } finally {
      setAdding(false);
    }
  };

  // Group materials by session
  const filteredMaterials = selectedMonth === 'all' 
    ? materials 
    : materials.filter(m => m.sessions?.month_number.toString() === selectedMonth);

  const materialsBySession = filteredMaterials.reduce((acc, curr) => {
    const sId = curr.session_id;
    if (!acc[sId]) {
      acc[sId] = {
        session: curr.sessions,
        items: []
      };
    }
    acc[sId].items.push(curr);
    return acc;
  }, {});

  const getIconForType = (type) => {
    switch(type) {
      case 'slides': return <FileText className="w-4 h-4 text-info-fg" />;
      case 'recording': return <Video className="w-4 h-4 text-danger-fg" />;
      case 'document': return <BookOpen className="w-4 h-4 text-warning-fg" />;
      default: return <LinkIcon className="w-4 h-4 text-fg-secondary" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-7xl font-display font-medium leading-[1.1] tracking-tighter text-fg-primary mb-4">Class Materials</h1>
          <p className="text-h3 text-fg-tertiary">Manage and share resources with students.</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-surface border-border-default text-fg-primary">
              <SelectValue placeholder="Filter by Month" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-default">
              <SelectItem value="all">All Months</SelectItem>
              <SelectItem value="4">Month 4</SelectItem>
              <SelectItem value="5">Month 5</SelectItem>
              <SelectItem value="6">Month 6</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary flex items-center gap-2 border-0">
                <PlusCircle className="w-4 h-4" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface border-border-default text-fg-primary sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Material</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddMaterial} className="space-y-4 mt-4">
                <div>
                  <label className="block text-label text-fg-secondary mb-2">SESSION</label>
                  <Select value={newSessionId} onValueChange={setNewSessionId} required>
                    <SelectTrigger className="w-full bg-surface-inset border-border-default">
                      <SelectValue placeholder="Select Session" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border-default max-h-[200px]">
                      {sessions.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {format(new Date(s.date), 'MMM d')} - {s.topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-label text-fg-secondary mb-2">TITLE</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Session Slides" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-label text-fg-secondary mb-2">TYPE</label>
                  <Select value={newType} onValueChange={setNewType} required>
                    <SelectTrigger className="w-full bg-surface-inset border-border-default">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border-default">
                      <SelectItem value="slides">Slides</SelectItem>
                      <SelectItem value="recording">Recording</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="link">Other Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-label text-fg-secondary mb-2">URL</label>
                  <input 
                    type="url" 
                    className="input w-full" 
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://..." 
                    required 
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={adding} className="btn-primary w-full border-0">
                    {adding ? 'Saving...' : 'Save Material'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-fg-secondary">Loading materials...</div>
      ) : Object.keys(materialsBySession).length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="w-8 h-8 text-fg-tertiary mx-auto mb-4" />
          <h3 className="text-h3 text-fg-primary mb-2">No materials found</h3>
          <p className="text-body-sm text-fg-secondary">
            {selectedMonth === 'all' ? "You haven't added any materials yet." : `No materials found for Month ${selectedMonth}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.values(materialsBySession)
            .sort((a, b) => new Date(b.session.date) - new Date(a.session.date))
            .map(({ session, items }) => (
            <div key={session.id} className="premium-card p-0 overflow-hidden group">
              <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                <div className="text-label text-fg-tertiary mb-2 uppercase tracking-widest font-bold">
                  {format(new Date(session.date), 'MMM d, yyyy')} • Month {session.month_number}
                </div>
                <h3 className="text-h3 text-fg-primary group-hover:text-indigo-400 transition-colors">{session.topic}</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {items.map(item => (
                  <a 
                    key={item.id} 
                    href={item.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/50 hover:bg-white/[0.06] transition-all hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                      {getIconForType(item.type)}
                    </div>
                    <div className="text-center overflow-hidden w-full">
                      <div className="text-body-sm font-bold text-fg-primary truncate">{item.title}</div>
                      <div className="text-[10px] text-fg-tertiary uppercase tracking-tighter font-bold">{item.type}</div>
                    </div>
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
