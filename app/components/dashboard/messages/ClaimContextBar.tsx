'use client';

interface Props {
  claim: {
    claimId:      string;
    claimNumber:  string;
    claimType:    string;
    claimedAmount: number | null;
    status:       string;
    scoreRisque:  number | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'En attente',   color: 'bg-yellow-100 text-yellow-800' },
  IN_REVIEW:   { label: 'En révision',  color: 'bg-blue-100 text-blue-800' },
  APPROVED:    { label: 'Approuvé',     color: 'bg-green-100 text-green-800' },
  REJECTED:    { label: 'Rejeté',       color: 'bg-red-100 text-red-800' },
  PAID:        { label: 'Payé',         color: 'bg-purple-100 text-purple-800' },
  CLOSED:      { label: 'Clôturé',      color: 'bg-gray-100 text-gray-700' },
};

export default function ClaimContextBar({ claim }: Props) {
  const statusInfo = STATUS_LABELS[claim.status] ?? { label: claim.status, color: 'bg-gray-100 text-gray-700' };
  const riskColor = claim.scoreRisque == null
    ? 'text-gray-400'
    : claim.scoreRisque >= 70 ? 'text-red-600 font-bold'
    : claim.scoreRisque >= 40 ? 'text-yellow-600 font-semibold'
    : 'text-green-600';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 border-b border-purple-100 text-sm flex-wrap">
      <span className="text-purple-600 font-semibold">📋 {claim.claimNumber}</span>
      <span className="text-gray-600">{claim.claimType}</span>
      {claim.claimedAmount != null && (
        <span className="text-gray-700">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(claim.claimedAmount)}
        </span>
      )}
      <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
      {claim.scoreRisque != null && (
        <span className={`text-xs ${riskColor}`}>Score risque: {claim.scoreRisque}%</span>
      )}
    </div>
  );
}
