'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { Contact } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Plus, X, ExternalLink, Search, Mail, Loader2, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type ApolloResult = {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string | null;
  email_status: string;
  linkedin_url: string | null;
  organization: string;
  organization_website: string;
  city: string;
  state: string;
  country: string;
  seniority: string;
};

export default function ContactsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<(Contact & { accounts?: { org_name: string } })[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; org_name: string; website: string | null }[]>([]);
  const [showForm, setShowForm] = useState(searchParams.get('add') === 'true');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Apollo search state
  const [showApolloSearch, setShowApolloSearch] = useState(false);
  const [apolloSearching, setApolloSearching] = useState(false);
  const [apolloResults, setApolloResults] = useState<ApolloResult[]>([]);
  const [apolloError, setApolloError] = useState<string | null>(null);
  const [apolloQuery, setApolloQuery] = useState({ name: '', organization: '', title: '' });

  // Enrichment state (for existing contacts)
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichResult, setEnrichResult] = useState<{ id: string; email: string | null; status: string } | null>(null);

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
      .select('id, org_name, website')
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
        notes: `Added ${form.full_name} (${form.role_type.replace(/_/g, ' ')})${form.email ? ' — email: ' + form.email : ''}`,
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

  // Apollo: search for people
  const searchApollo = async () => {
    if (!apolloQuery.name && !apolloQuery.organization && !apolloQuery.title) return;

    setApolloSearching(true);
    setApolloError(null);
    setApolloResults([]);

    try {
      const res = await fetch('/api/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'people_search',
          name: apolloQuery.name,
          organization: apolloQuery.organization,
          titles: apolloQuery.title ? [apolloQuery.title] : [],
          per_page: 10,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApolloError(data.error || 'Search failed');
        return;
      }

      setApolloResults(data.people || []);
      if ((data.people || []).length === 0) {
        setApolloError('No results found. Try broadening your search.');
      }
    } catch (err: any) {
      setApolloError(err.message || 'Network error');
    } finally {
      setApolloSearching(false);
    }
  };

  // Apollo: import a result into the form
  const importApolloResult = (person: ApolloResult) => {
    setForm({
      ...form,
      full_name: person.name,
      title: person.title || '',
      linkedin_url: person.linkedin_url || '',
      email: person.email || '',
    });
    setShowApolloSearch(false);
    setShowForm(true);
  };

  // Apollo: enrich an existing contact (find their email)
  const enrichContact = async (contact: Contact & { accounts?: { org_name: string } }) => {
    setEnrichingId(contact.id);
    setEnrichResult(null);

    try {
      const nameParts = contact.full_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const orgName = (contact as any).accounts?.org_name || '';

      const res = await fetch('/api/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enrich_person',
          first_name: firstName,
          last_name: lastName,
          organization: orgName,
          linkedin_url: contact.linkedin_url || undefined,
        }),
      });

      const data = await res.json();

      if (data.person?.email) {
        // Update contact in Supabase
        await supabase
          .from('contacts')
          .update({ email: data.person.email })
          .eq('id', contact.id);

        setEnrichResult({ id: contact.id, email: data.person.email, status: 'found' });

        await supabase.from('pipeline_activity').insert([{
          account_id: contact.account_id,
          action: 'email_enriched',
          notes: `Found email for ${contact.full_name} via Apollo`,
        }]);

        fetchContacts();
      } else {
        setEnrichResult({ id: contact.id, email: null, status: 'not_found' });
      }
    } catch (err) {
      setEnrichResult({ id: contact.id, email: null, status: 'error' });
    } finally {
      setEnrichingId(null);
    }
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowApolloSearch(!showApolloSearch); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              showApolloSearch
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-edge-800 text-edge-200 border border-edge-700/50 hover:bg-edge-700 hover:text-edge-100'
            }`}
          >
            {showApolloSearch ? <X size={16} /> : <Zap size={16} />}
            {showApolloSearch ? 'Close' : 'Apollo Search'}
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowApolloSearch(false); }}
            className="btn-primary flex items-center gap-2"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Add Contact'}
          </button>
        </div>
      </div>

      {/* Apollo Search Panel */}
      {showApolloSearch && (
        <div className="card p-6 mb-6 border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-amber-400" />
            <h2 className="font-display text-lg text-edge-200">Find Contacts via Apollo</h2>
            <span className="text-[10px] text-edge-600 uppercase tracking-wider ml-auto">Email Discovery</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Person Name</label>
              <input
                type="text"
                value={apolloQuery.name}
                onChange={(e) => setApolloQuery({ ...apolloQuery, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Sarah Cohen"
                onKeyDown={(e) => e.key === 'Enter' && searchApollo()}
              />
            </div>
            <div>
              <label className="label">Organization</label>
              <input
                type="text"
                value={apolloQuery.organization}
                onChange={(e) => setApolloQuery({ ...apolloQuery, organization: e.target.value })}
                className="input-field"
                placeholder="e.g., Jewish Federation"
                onKeyDown={(e) => e.key === 'Enter' && searchApollo()}
              />
            </div>
            <div>
              <label className="label">Title / Role</label>
              <input
                type="text"
                value={apolloQuery.title}
                onChange={(e) => setApolloQuery({ ...apolloQuery, title: e.target.value })}
                className="input-field"
                placeholder="e.g., VP Communications"
                onKeyDown={(e) => e.key === 'Enter' && searchApollo()}
              />
            </div>
          </div>

          <button
            onClick={searchApollo}
            disabled={apolloSearching || (!apolloQuery.name && !apolloQuery.organization && !apolloQuery.title)}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {apolloSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {apolloSearching ? 'Searching...' : 'Search Apollo'}
          </button>

          {/* Apollo Results */}
          {apolloError && (
            <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{apolloError}</p>
            </div>
          )}

          {apolloResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-edge-500 mb-2">{apolloResults.length} result{apolloResults.length !== 1 ? 's' : ''} found</p>
              {apolloResults.map((person) => (
                <div key={person.id} className="flex items-center gap-4 p-3 rounded-md bg-edge-900/60 border border-edge-800/50 hover:border-edge-700/50 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-edge-100 font-medium text-sm">{person.name}</span>
                      {person.title && (
                        <span className="text-edge-500 text-xs">— {person.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-edge-500">{person.organization}</span>
                      {person.email && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <Mail size={11} />
                          {person.email}
                        </span>
                      )}
                      {!person.email && (
                        <span className="text-xs text-edge-600">No email found</span>
                      )}
                    </div>
                  </div>
                  {person.linkedin_url && (
                    <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="text-edge-500 hover:text-accent transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => importApolloResult(person)}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    Import
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              <label className="label">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pr-8"
                  placeholder="Found via Apollo or manual entry"
                />
                {form.email && (
                  <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
                )}
              </div>
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
          <p className="text-edge-600 text-sm">Use Apollo Search to find contacts with verified emails, or add manually</p>
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
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-edge-500">
                    {(contact as any).accounts?.org_name}
                  </p>
                  {contact.email && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Mail size={11} />
                      {contact.email}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-xs text-edge-500 capitalize">{contact.role_type.replace(/_/g, ' ')}</span>
              <span className="font-mono text-xs text-edge-500">{contact.influence_level}/5</span>

              {contact.outreach_ready && (
                <span className="status-badge text-green-400 bg-green-400/10">Ready</span>
              )}

              {/* Enrich button — show if no email */}
              {!contact.email && (
                <button
                  onClick={() => enrichContact(contact)}
                  disabled={enrichingId === contact.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-amber-500/10 text-amber-400 
                             border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                >
                  {enrichingId === contact.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Zap size={12} />
                  )}
                  {enrichingId === contact.id ? 'Finding...' : 'Find Email'}
                </button>
              )}

              {/* Enrichment result feedback */}
              {enrichResult?.id === contact.id && enrichResult.status === 'not_found' && (
                <span className="text-xs text-edge-600">No email found</span>
              )}
              {enrichResult?.id === contact.id && enrichResult.status === 'found' && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 size={12} />
                  Found
                </span>
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
