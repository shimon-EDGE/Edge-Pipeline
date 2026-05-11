'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import EdgeScore from '@/components/EdgeScore';
import TierBadge from '@/components/TierBadge';
import StatusBadge from '@/components/StatusBadge';
import { Copy, Check, Send, Clock } from 'lucide-react';

export default function MessagesPage() {
  const supabase = createClient();
  const [queue, setQueue] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'queue' | 'all' | 'sent'>('queue');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: queueData } = await supabase
      .from('outreach_queue')
      .select('*');

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*, contacts:contact_id (full_name, linkedin_url, accounts:account_id (org_name))')
      .order('created_at', { ascending: false });

    setQueue(queueData || []);
    setAllMessages(messagesData || []);
    setLoading(false);
  };

  const copyMessage = async (id: string, body: string) => {
    await navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateMessageStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'approved') updates.approved_at = new Date().toISOString();
    if (status === 'sent') updates.sent_at = new Date().toISOString();

    await supabase.from('messages').update(updates).eq('id', id);
    fetchData();
  };

  const openLinkedIn = (url: string, messageId: string, body: string) => {
    copyMessage(messageId, body);
    window.open(url, '_blank');
  };

  const sentMessages = allMessages.filter((m) => m.status === 'sent' || m.status === 'replied');

  const sequenceLabels: Record<number, string> = {
    1: 'Initial',
    2: 'Follow-up 1',
    3: 'Follow-up 2',
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-edge-100">Messages</h1>
          <p className="text-edge-500 text-sm mt-1">Outreach queue and message history</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-edge-900/50 rounded-lg w-fit">
        {[
          { key: 'queue' as const, label: 'Queue', count: queue.length },
          { key: 'all' as const, label: 'All Messages', count: allMessages.length },
          { key: 'sent' as const, label: 'Sent', count: sentMessages.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              filter === key
                ? 'bg-edge-800 text-edge-100'
                : 'text-edge-500 hover:text-edge-300'
            }`}
          >
            {label} <span className="font-mono text-xs ml-1">({count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-edge-500">Loading...</div>
      ) : filter === 'queue' ? (
        /* Outreach Queue View */
        queue.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-edge-400 mb-2">Outreach queue is empty</p>
            <p className="text-edge-600 text-sm">
              Generate messages for your contacts to populate the queue
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => (
              <div key={item.message_id} className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <EdgeScore score={item.edge_score} size="sm" />
                  <TierBadge tier={item.priority_tier} />
                  <span className="text-edge-100 font-medium">{item.full_name}</span>
                  <span className="text-edge-600">·</span>
                  <span className="text-edge-500 text-sm">{item.org_name}</span>
                  <span className="text-edge-600">·</span>
                  <span className="text-xs text-edge-500">
                    {sequenceLabels[item.sequence_position] || `#${item.sequence_position}`}
                  </span>
                  <StatusBadge status={item.message_status} />
                  {item.follow_up_due && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <Clock size={12} />
                      Due {item.follow_up_due}
                    </span>
                  )}
                </div>

                <div className="bg-edge-950/50 rounded-md p-4 mb-3 border border-edge-800/30">
                  <p className="text-sm text-edge-300 leading-relaxed whitespace-pre-wrap">
                    {item.message_body}
                  </p>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => copyMessage(item.message_id, item.message_body)}
                    className="btn-secondary flex items-center gap-2 text-xs"
                  >
                    {copiedId === item.message_id ? <Check size={13} /> : <Copy size={13} />}
                    {copiedId === item.message_id ? 'Copied' : 'Copy'}
                  </button>

                  {item.message_status === 'drafted' && (
                    <button
                      onClick={() => updateMessageStatus(item.message_id, 'approved')}
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      Approve
                    </button>
                  )}

                  {item.linkedin_url && item.message_status === 'approved' && (
                    <button
                      onClick={() => openLinkedIn(item.linkedin_url, item.message_id, item.message_body)}
                      className="btn-primary flex items-center gap-2 text-xs"
                    >
                      <Send size={13} />
                      Copy & Open LinkedIn
                    </button>
                  )}

                  {item.message_status === 'approved' && (
                    <button
                      onClick={() => updateMessageStatus(item.message_id, 'sent')}
                      className="btn-secondary flex items-center gap-2 text-xs text-green-400"
                    >
                      <Check size={13} />
                      Mark Sent
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* All / Sent Messages View */
        <div className="space-y-2">
          {(filter === 'sent' ? sentMessages : allMessages).map((msg) => (
            <div key={msg.id} className="card-hover p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-edge-100 font-medium text-sm">
                  {msg.contacts?.full_name}
                </span>
                <span className="text-edge-600">·</span>
                <span className="text-xs text-edge-500">
                  {msg.contacts?.accounts?.org_name}
                </span>
                <span className="text-xs text-edge-600">
                  {sequenceLabels[msg.sequence_position]}
                </span>
                <StatusBadge status={msg.status} />
                {msg.sent_at && (
                  <span className="text-[10px] text-edge-600 ml-auto">
                    Sent {new Date(msg.sent_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-edge-400 truncate">{msg.message_body}</p>
            </div>
          ))}
          {(filter === 'sent' ? sentMessages : allMessages).length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-edge-500 text-sm">No messages found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
