import { createServerSupabaseClient } from '@/lib/supabase-server';
import EdgeScore from '@/components/EdgeScore';
import TierBadge from '@/components/TierBadge';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import { Building2, Users, MessageSquare, Send } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  // Fetch stats
  const { count: accountCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });

  const { count: activeCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: contactCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  const { count: pendingMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('status', ['drafted', 'approved']);

  // Fetch outreach queue
  const { data: queue } = await supabase
    .from('outreach_queue')
    .select('*')
    .limit(10);

  // Fetch recent activity
  const { data: recentActivity } = await supabase
    .from('pipeline_activity')
    .select(`
      *,
      accounts:account_id (org_name)
    `)
    .order('created_at', { ascending: false })
    .limit(8);

  const stats = [
    { label: 'Accounts', value: accountCount || 0, icon: Building2, href: '/accounts' },
    { label: 'Active', value: activeCount || 0, icon: Send, href: '/accounts' },
    { label: 'Contacts', value: contactCount || 0, icon: Users, href: '/contacts' },
    { label: 'Pending', value: pendingMessages || 0, icon: MessageSquare, href: '/messages' },
  ];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl text-edge-100">Command Center</h1>
        <p className="text-edge-500 text-sm mt-1">EDGE Pipeline Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="card-hover p-4 group">
            <div className="flex items-center justify-between mb-3">
              <Icon size={18} className="text-edge-500 group-hover:text-accent transition-colors" />
              <span className="font-mono text-2xl text-edge-100">{value}</span>
            </div>
            <p className="text-edge-500 text-xs uppercase tracking-wider">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Outreach Queue */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-edge-200">Outreach Queue</h2>
            <Link href="/messages" className="text-xs text-accent hover:text-accent-light transition-colors">
              View all →
            </Link>
          </div>

          {queue && queue.length > 0 ? (
            <div className="space-y-2">
              {queue.map((item: any) => (
                <div key={item.message_id} className="flex items-center gap-4 p-3 rounded-md bg-edge-900/40 hover:bg-edge-900/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-edge-200 truncate">
                        {item.full_name}
                      </span>
                      <span className="text-edge-600">·</span>
                      <span className="text-xs text-edge-500 truncate">{item.org_name}</span>
                    </div>
                    <p className="text-xs text-edge-500 truncate">{item.message_body}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <EdgeScore score={item.edge_score} size="sm" />
                    <TierBadge tier={item.priority_tier} />
                    <StatusBadge status={item.message_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-edge-500 text-sm">No messages in queue</p>
              <p className="text-edge-600 text-xs mt-1">Add accounts and generate messages to populate</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <h2 className="font-display text-lg text-edge-200 mb-4">Activity</h2>

          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-edge-600 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-edge-300">
                      <span className="text-edge-400">{activity.action.replace(/_/g, ' ')}</span>
                      {activity.accounts && (
                        <> · <span className="text-edge-500">{activity.accounts.org_name}</span></>
                      )}
                    </p>
                    {activity.notes && (
                      <p className="text-xs text-edge-600 truncate mt-0.5">{activity.notes}</p>
                    )}
                    <p className="text-[10px] text-edge-700 mt-0.5">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-edge-500 text-sm">No activity yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
