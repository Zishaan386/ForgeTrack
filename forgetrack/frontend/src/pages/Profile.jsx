import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export const Profile = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-display-lg text-fg-primary">User Information</h1>
        <p className="text-body text-fg-secondary">View and manage your account details.</p>
      </div>

      <div className="premium-card p-12 space-y-10">
        <div className="flex items-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-4xl font-display font-medium text-indigo-400">
            {profile.display_name?.charAt(0)}
          </div>
          <div>
            <div className="text-h2 text-fg-primary mb-1">{profile.display_name}</div>
            <div className="flex items-center gap-2">
              <span className="pill pill-success capitalize">{profile.role}</span>
              <span className="text-caption text-fg-tertiary">Member since {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-white/5">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-fg-secondary" />
              </div>
              <div>
                <div className="text-label text-fg-tertiary uppercase tracking-wider mb-1">Email Address</div>
                <div className="text-body text-fg-primary">{profile.email}</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-fg-secondary" />
              </div>
              <div>
                <div className="text-label text-fg-tertiary uppercase tracking-wider mb-1">Role & Permissions</div>
                <div className="text-body text-fg-primary capitalize">{profile.role} Access</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-fg-secondary" />
              </div>
              <div>
                <div className="text-label text-fg-tertiary uppercase tracking-wider mb-1">Display Name</div>
                <div className="text-body text-fg-primary">{profile.display_name}</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-fg-secondary" />
              </div>
              <div>
                <div className="text-label text-fg-tertiary uppercase tracking-wider mb-1">Account ID</div>
                <div className="text-caption text-fg-tertiary font-mono break-all">{profile.id}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
        <div>
          <div className="text-body font-medium text-amber-200">Security Notice</div>
          <div className="text-body-sm text-amber-500/60">If you need to change your password, please contact the administrator.</div>
        </div>
      </div>
    </div>
  );
};
