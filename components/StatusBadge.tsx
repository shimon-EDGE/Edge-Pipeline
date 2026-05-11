type Props = {
  status: string;
};

const statusStyles: Record<string, string> = {
  researching: 'text-blue-400 bg-blue-400/10',
  qualified: 'text-purple-400 bg-purple-400/10',
  active: 'text-green-400 bg-green-400/10',
  paused: 'text-edge-400 bg-edge-400/10',
  closed_won: 'text-accent bg-accent/10',
  closed_lost: 'text-red-400 bg-red-400/10',
  drafted: 'text-edge-400 bg-edge-400/10',
  approved: 'text-blue-400 bg-blue-400/10',
  sent: 'text-purple-400 bg-purple-400/10',
  replied: 'text-green-400 bg-green-400/10',
  no_response: 'text-orange-400 bg-orange-400/10',
};

export default function StatusBadge({ status }: Props) {
  const style = statusStyles[status] || 'text-edge-400 bg-edge-400/10';
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`status-badge ${style}`}>
      {label}
    </span>
  );
}
