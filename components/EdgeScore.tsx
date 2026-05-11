type Props = {
  score: number;
  size?: 'sm' | 'md' | 'lg';
};

export default function EdgeScore({ score, size = 'md' }: Props) {
  const getColor = () => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-amber-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-edge-500';
  };

  const getSize = () => {
    if (size === 'sm') return 'text-sm';
    if (size === 'lg') return 'text-2xl';
    return 'text-lg';
  };

  return (
    <span className={`edge-score ${getColor()} ${getSize()}`}>
      {score}<span className="text-edge-600 text-xs">/10</span>
    </span>
  );
}
