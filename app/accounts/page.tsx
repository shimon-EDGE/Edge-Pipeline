'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { Account } from '@/lib/types';
import EdgeScore from '@/components/EdgeScore';
import TierBadge from '@/components/TierBadge';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import { Plus, X, ChevronRight } from 'lucide-react';

export default function AccountsPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    org_name: '',
    website: '',
    us_israel_complexity: 0,
    content_intensity: 0,
    fragmentation_risk: 0,
    org_size: 0,
    signal_strength: 0,
    priority_tier: 'C' as 'A' | 'B' | 'C',
    source: 'linkedin' as string,
    status: 'researching' as string,
    fragmentation_notes: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .order('edge_score', { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('accounts').insert([form]);

    if (!error) {
      // Log activity
      const { data: newAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('org_name', form.org_name)
        .single();

      if (newAccount) {
        await supabase.from('pipeline_activity').insert([{
          account_id: newAccount.id,
          action: 'account_created',
          notes: `Added ${form.org_name} via ${form.source}`,
        }]);
      }

      setShowForm(false);
      setForm({
        org_name: '', website: '', us_israel_complexity: 0,
        content_intensity: 0, fragmentation_risk: 0, org_size: 0,
        signal_strength: 0, priority_tier: 'C', source: 'linkedin',
        status: 'researching', fragmentation_notes: '',
      });
      fetchAccounts();
    }

    setSaving(false);
  };

  const ScoreSlider = ({ label, field, value }: { label: string; field: string; value: number }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label mb-0">{label}</label>
        <span className="font-mono text-sm text-accent">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={1}
        value={value}
        onChange={(e) => setForm({ ...form, [field]: parseInt(e.target.value) })}
        className="w-full accent-accent h-1"
      />
      <div className="flex justify-between text-[10px] text-edge-600 mt-0.5">
        <span>Low</span><span>Med</span><span>High</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-edge-100">Accounts</h1>
          <p className="text-edge-500 text-sm mt-1">
            {accounts.length} organization{accounts.length !== 1 ? 's' : ''} in pipeline
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Account'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6">
          <h2 className="font-display text-lg text-edge-200 mb-4">New Account</h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: Basic info */}
            <div className="space-y-4">
              <div>
                <label className="label">Organization Name *</label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => setForm({ ...form, org_name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., American Friends of Hebrew University"
                  required
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="select-field"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="referral">Referral</option>
                    <option value="research">Research</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="select-field"
                  >
                    <option value="researching">Researching</option>
                    <option value="qualified">Qualified</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={form.priority_tier}
                    onChange={(e) => setForm({ ...form, priority_tier: e.target.value as 'A' | 'B' | 'C' })}
                    className="select-field"
                  >
                    <option value="A">Tier A</option>
                    <option value="B">Tier B</option>
                    <option value="C">Tier C</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Fragmentation Notes</label>
                <textarea
                  value={form.fragmentation_notes}
                  onChange={(e) => setForm({ ...form, fragmentation_notes: e.target.value })}
                  className="input-field h-24 resize-none"
                  placeholder="What fragmentation signals do you see?"
                />
              </div>
            </div>

            {/* Right: EDGE scoring */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-edge-300">EDGE Scoring</h3>
                <div className="text-right">
                  <span className="text-xs text-edge-500">Preview: </span>
                  <span className="font-mono text-lg text-accent">
                    {form.us_israel_complexity + form.content_intensity + form.fragmentation_risk + form.org_size + form.signal_strength}
                  </span>
                  <span className="text-edge-600 text-xs">/10</span>
                </div>
              </div>
              <ScoreSlider label="US–Israel Complexity" field="us_israel_complexity" value={form.us_israel_complexity} />
              <ScoreSlider label="Content Intensity" field="content_intensity" value={form.content_intensity} />
              <ScoreSlider label="Fragmentation Risk" field="fragmentation_risk" value={form.fragmentation_risk} />
              <ScoreSlider label="Org Size" field="org_size" value={form.org_size} />
              <ScoreSlider label="Signal Strength" field="signal_strength" value={form.signal_strength} />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-edge-800/50">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      {/* Account List */}
      {loading ? (
        <div className="card p-8 text-center text-edge-500">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-edge-400 mb-2">No accounts yet</p>
          <p className="text-edge-600 text-sm">Add your first organization to start building your pipeline</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="card-hover p-4 flex items-center gap-4 group block"
            >
              <EdgeScore score={account.edge_score} />
              <TierBadge tier={account.priority_tier} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-edge-100 font-medium truncate">
                    {account.org_name}
                  </span>
                  <StatusBadge status={account.status} />
                </div>
                {account.fragmentation_notes && (
                  <p className="text-xs text-edge-500 truncate mt-0.5">
                    {account.fragmentation_notes}
                  </p>
                )}
              </div>
              <span className="text-xs text-edge-600">
                {account.source}
              </span>
              <ChevronRight size={16} className="text-edge-700 group-hover:text-edge-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
