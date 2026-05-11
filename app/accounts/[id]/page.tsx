'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useParams, useRouter } from 'next/navigation';
import type { Account, Contact } from '@/lib/types';
import EdgeScore from '@/components/EdgeScore';
import TierBadge from '@/components/TierBadge';
import StatusBadge from '@/components/StatusBadge';
import { ArrowLeft, Users, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AccountDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: acc } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', params.id)
      .single();

    const { data: cons } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', params.id)
      .order('influence_level', { ascending: false });

    setAccount(acc);
    setContacts(cons || []);
    setLoading(false);
  };

  const updateStatus = async (status: string) => {
    await supabase.from('accounts').update({ status }).eq('id', params.id);
    fetchData();
  };

  if (loading) {
    return <div className="text-edge-500">Loading...</div>;
  }

  if (!account) {
    return <div className="text-edge-500">Account not found</div>;
  }

  const dimensions = [
    { label: 'US–Israel Complexity', value: account.us_israel_complexity },
    { label: 'Content Intensity', value: account.content_intensity },
    { label: 'Fragmentation Risk', value: account.fragmentation_risk },
    { label: 'Org Size', value: account.org_size },
    { label: 'Signal Strength', value: account.signal_strength },
  ];

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <button
        onClick={() => router.push('/accounts')}
        className="flex items-center gap-2 text-edge-500 hover:text-edge-300 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        All Accounts
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-2xl text-edge-100">{account.org_name}</h1>
            <TierBadge tier={account.priority_tier} />
            <StatusBadge status={account.status} />
          </div>
          {account.website && (
            <a href={account.website} target="_blank" rel="noopener noreferrer"
              className="text-sm text-edge-500 hover:text-accent flex items-center gap-1 transition-colors">
              {account.website} <ExternalLink size={12} />
            </a>
          )}
        </div>
        <EdgeScore score={account.edge_score} size="lg" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* EDGE Dimensions */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-edge-300 mb-4">EDGE Dimensions</h2>
          <div className="space-y-3">
            {dimensions.map(({ label, value }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-edge-500">{label}</span>
                  <span className="font-mono text-sm text-edge-300">{value}/2</span>
                </div>
                <div className="h-1.5 bg-edge-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(value / 2) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status & Actions */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-edge-300 mb-4">Pipeline Stage</h2>
          <div className="space-y-2">
            {['researching', 'qualified', 'active', 'paused', 'closed_won', 'closed_lost'].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                  account.status === s
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-edge-500 hover:text-edge-300 hover:bg-edge-800/50'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Fragmentation Notes */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-edge-300 mb-4">Fragmentation Diagnosis</h2>
          <p className="text-sm text-edge-400 leading-relaxed">
            {account.fragmentation_notes || 'No diagnosis recorded yet.'}
          </p>
          <div className="mt-4 pt-3 border-t border-edge-800/50">
            <p className="text-[10px] text-edge-600 uppercase tracking-wider">Source</p>
            <p className="text-sm text-edge-400 mt-0.5">{account.source}</p>
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-edge-200 flex items-center gap-2">
            <Users size={18} />
            Contacts ({contacts.length})
          </h2>
          <Link
            href={`/contacts?add=true&account_id=${account.id}`}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            Add Contact
          </Link>
        </div>

        {contacts.length > 0 ? (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="card-hover p-4 flex items-center gap-4 block"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-edge-100 font-medium">{contact.full_name}</span>
                  {contact.title && (
                    <span className="text-edge-500 text-sm ml-2">{contact.title}</span>
                  )}
                </div>
                <span className="text-xs text-edge-500 capitalize">{contact.role_type.replace(/_/g, ' ')}</span>
                <span className="font-mono text-xs text-edge-500">{contact.influence_level}/5</span>
                {contact.outreach_ready && (
                  <span className="text-xs text-green-400">Ready</span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-edge-500 text-sm">No contacts added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
