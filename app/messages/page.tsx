'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import EdgeScore from '@/components/EdgeScore';
import TierBadge from '@/components/TierBadge';
import StatusBadge from '@/components/StatusBadge';
import { Copy, Check, Send, Clock, Mail, ExternalLink, AtSign } from 'lucide-react';

export default function MessagesPage() {
  const supabase = createClient();
  const [queue, setQueue] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [filter, setFilter] = useState<'queue' | 'all' | 'sent'>('queue');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch queue with contact email info
    const { data: queueData } = await supabase
      .from('outreach_queue')
      .select('*');

    // Also fetch contact emails for queue items
    if (queueData && queueData.length > 0) {
      // Get contact info for each queue item via the message's contact
      const { data: messagesWithContacts } = await supabase
        .from('messages')
        .select('id, contact_id, contacts:contact_id (email, full_name)')
        .in('id', queueData.map((q: any) => q.message_id));

      // Build a lookup of message_id -> email
      const emailLookup: Record<string, string> = {};
      (messagesWithContacts || []).forEach((m: any) => {
        if (m.contacts?.email) {
          emailLookup[m.id] = m.contacts.email;
        }
      });

      // Attach emails to queue items
      queueData.forEach((item: any) => {
        item.contact_email = emailLookup[item.message_id] || null;
      });
    }

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*, contacts:contact_id (full_name, linkedin_url, email, accounts:account_id (org_name))')
      .order('created_at', { ascending: false });

    setQueue(queueData || []);
    setAllMessages(messagesData || []);
    setLoading(false);
  };

  const copyToClipboard = async (id: string, text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopiedField(field);
    setTimeout(() => { setCopiedId(null); setCopiedField(null); }, 2000);
  };

  const updateMessageStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'approved') updates.approved_at = new Date().toISOString();
    if (status === 'sent') updates.sent_at = new Date().toISOString();

    await supabase.from('messages').update(updates).eq('id', id);
    fetchData();
  };

  // Generate email subject line from context
  const generateSubject = (item: any) => {
    const position = item.sequence_position || 1;
    const orgName = item.org_name || '';
    
    if (position === 1) {
      return `Video operations at ${orgName} — a thought`;
    } else if (position === 2) {
      return `Re: Video operations at ${orgName}`;
    } else {
      return `Following up — ${orgName} video continuity`;
    }
  };

  // Open mailto link
  const openMailto = (email: string, subject: string, body: string, messageId: string) => {
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
    // Auto-copy body as well
    copyToClipboard(messageId, body, 'body');
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
          <p className="text-edge-500 text-sm mt-1">Email outreach queue and message history</p>
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
            {queue.map((item) => {
              const subject = generateSubject(item);
              const hasEmail = !!item.contact_email;

              return (
                <div key={item.message_id} className="card p-5">
                  {/* Header row */}
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

                  {/* Email recipient */}
                  <div className="flex items-center gap-2 mb-3 px-4 py-2 rounded-md bg-edge-950/50 border border-edge-800/30">
                    <AtSign size={13} className={hasEmail ? 'text-green-400' : 'text-edge-600'} />
                    {hasEmail ? (
                      <span className="text-sm text-green-400 font-mono">{item.contact_email}</span>
                    ) : (
                      <span className="text-sm text-edge-600 italic">No email — enrich this contact in the Contacts tab</span>
                    )}
                    {hasEmail && (
                      <button
                        onClick={() => copyToClipboard(item.message_id, item.contact_email, 'email')}
                        className="ml-auto text-edge-500 hover:text-edge-300 transition-colors"
                        title="Copy email"
                      >
                        {copiedId === item.message_id && copiedField === 'email' ? (
                          <Check size={13} className="text-green-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Subject line */}
                  <div className="flex items-center gap-2 mb-2 px-4 py-2 rounded-md bg-edge-950/30 border border-edge-800/20">
                    <span className="text-[10px] text-edge-600 uppercase tracking-wider shrink-0">Subject</span>
                    <span className="text-sm text-edge-300 flex-1">{subject}</span>
                    <button
                      onClick={() => copyToClipboard(item.message_id + '-subj', subject, 'subject')}
                      className="text-edge-500 hover:text-edge-300 transition-colors shrink-0"
                      title="Copy subject"
                    >
                      {copiedId === item.message_id + '-subj' && copiedField === 'subject' ? (
                        <Check size={13} className="text-green-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>

                  {/* Message body */}
                  <div className="bg-edge-950/50 rounded-md p-4 mb-3 border border-edge-800/30">
                    <p className="text-sm text-edge-300 leading-relaxed whitespace-pre-wrap">
                      {item.message_body}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 justify-end">
                    {/* Copy body */}
                    <button
                      onClick={() => copyToClipboard(item.message_id, item.message_body, 'body')}
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      {copiedId === item.message_id && copiedField === 'body' ? <Check size={13} /> : <Copy size={13} />}
                      {copiedId === item.message_id && copiedField === 'body' ? 'Copied' : 'Copy Message'}
                    </button>

                    {/* Copy all (email + subject + body) */}
                    {hasEmail && (
                      <button
                        onClick={() => {
                          const fullText = `To: ${item.contact_email}\nSubject: ${subject}\n\n${item.message_body}`;
                          copyToClipboard(item.message_id + '-all', fullText, 'all');
                        }}
                        className="btn-secondary flex items-center gap-2 text-xs"
                      >
                        {copiedId === item.message_id + '-all' && copiedField === 'all' ? (
                          <Check size={13} className="text-green-400" />
                        ) : (
                          <Mail size={13} />
                        )}
                        {copiedId === item.message_id + '-all' && copiedField === 'all' ? 'Copied All' : 'Copy Full Email'}
                      </button>
                    )}

                    {/* Approve */}
                    {item.message_status === 'drafted' && (
                      <button
                        onClick={() => updateMessageStatus(item.message_id, 'approved')}
                        className="btn-secondary flex items-center gap-2 text-xs"
                      >
                        Approve
                      </button>
                    )}

                    {/* Open in mail client */}
                    {hasEmail && item.message_status === 'approved' && (
                      <button
                        onClick={() => openMailto(item.contact_email, subject, item.message_body, item.message_id)}
                        className="btn-primary flex items-center gap-2 text-xs"
                      >
                        <Send size={13} />
                        Open in Mail
                      </button>
                    )}

                    {/* Fallback: Open LinkedIn if no email but has LinkedIn */}
                    {!hasEmail && item.linkedin_url && item.message_status === 'approved' && (
                      <button
                        onClick={() => {
                          copyToClipboard(item.message_id, item.message_body, 'body');
                          window.open(item.linkedin_url, '_blank');
                        }}
                        className="btn-secondary flex items-center gap-2 text-xs"
                      >
                        <ExternalLink size={13} />
                        Copy & Open LinkedIn
                      </button>
                    )}

                    {/* Mark sent */}
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
              );
            })}
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
                {msg.contacts?.email && (
                  <>
                    <span className="text-edge-600">·</span>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Mail size={11} />
                      {msg.contacts.email}
                    </span>
                  </>
                )}
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
