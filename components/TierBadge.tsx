type Props = {
  tier: 'A' | 'B' | 'C';
};

export default function TierBadge({ tier }: Props) {
  const styles = {
    A: 'tier-a',
    B: 'tier-b',
    C: 'tier-c',
  };

  return (
    <span className={`status-badge border ${styles[tier]}`}>
      Tier {tier}
    </span>
  );
}
