'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { Contact } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Plus, X, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function ContactsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<(Contact & { accounts?: { org_name: string } })[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; org_name: string }[]>([]);
  const [showForm, setShowForm] = useState(searchParams.get('add') === 'true');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    account_id: searchParams.get('account_id') || '',
    full_name: '',
    title: '',
    linkedin_url: '',
    email: '',
    role_type: 'decision_maker',
    influence_level: 3,
    outreach_ready: false,
    notes: '',
  });

  useEffect(() => {
    fetchContacts();
    fetchAccounts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contacts')
      .select('*, accounts:account_id (org_name)')
      .order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  };

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('accounts')
      .select('id, org_name')
      .order('org_name');
    setAccounts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('contacts').insert([form]);

    if (!error) {
      await supabase.from('pipeline_activity').insert([{
        account_id: form.account_id,
        action: 'contact_added',
        notes: `Added ${form.full_name} (${form.role_type.replace(/_/g, ' ')})`,
      }]);

      setShowForm(false);
      setForm({
        account_id: '', full_name: '', title: '', linkedin_url: '',
        email: '', role_type: 'decision_maker', influence_level: 3,
        outreach_ready: false, notes: '',
      });
      fetchContacts();
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-edge-100">Contacts</h1>
          <p className="text-edge-500 text-sm mt-1">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} across all accounts
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6">
          <h2 className="font-display text-lg text-edge-200 mb-4">New Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Account *</label>
              <select
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                className="select-field"
                required
              >
                <option value="">Select organization...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.org_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Title / Role</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
                placeholder="e.g., VP Communications"
              />
            </div>
            <div>
              <label className="label">LinkedIn URL</label>
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                className="input-field"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Role Type</label>
              <select
                value={form.role_type}
                onChange={(e) => setForm({ ...form, role_type: e.target.value })}
                className="select-field"
              >
                <option value="decision_maker">Decision Maker</option>
                <option value="influencer">Influencer</option>
                <option value="gatekeeper">Gatekeeper</option>
                <option value="champion">Champion</option>
              </select>
            </div>
            <div>
              <label className="label">Influence Level (1–5)</label>
              <input
                type="range"
                min={1} max={5} step={1}
                value={form.influence_level}
                onChange={(e) => setForm({ ...form, influence_level: parseInt(e.target.value) })}
                className="w-full accent-accent mt-2"
              />
              <div className="flex justify-between text-[10px] text-edge-600">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                checked={form.outreach_ready}
                onChange={(e) => setForm({ ...form, outreach_ready: e.target.checked })}
                className="accent-accent"
              />
              <label className="text-sm text-edge-300">Outreach ready</label>
            </div>
          </div>
          <div>
            <label className="label mt-4">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field h-20 resize-none"
              placeholder="Context about this contact..."
            />
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-edge-800/50">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Contact'}
            </button>
          </div>
        </form>
      )}

      {/* Contact List */}
      {loading ? (
        <div className="card p-8 text-center text-edge-500">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-edge-400 mb-2">No contacts yet</p>
          <p className="text-edge-600 text-sm">Add contacts to your accounts to start building outreach</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="card-hover p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-edge-100 font-medium">{contact.full_name}</span>
                  {contact.title && (
                    <span className="text-edge-500 text-sm">— {contact.title}</span>
                  )}
                </div>
                <p className="text-xs text-edge-500 mt-0.5">
                  {(contact as any).accounts?.org_name}
                </p>
              </div>
              <span className="text-xs text-edge-500 capitalize">{contact.role_type.replace(/_/g, ' ')}</span>
              <span className="font-mono text-xs text-edge-500">{contact.influence_level}/5</span>
              {contact.outreach_ready && (
                <span className="status-badge text-green-400 bg-green-400/10">Ready</span>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="text-edge-500 hover:text-accent transition-colors">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
