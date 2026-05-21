import { Clock } from "lucide-react";
import type { PremiumInfo } from "../types/tibia";
import { calculateTimeRemaining } from "../utils/parsePremiumText";

interface PremiumCardProps {
  premiumInfo: PremiumInfo;
  className?: string;
}

export const PremiumCard = ({ premiumInfo, className }: PremiumCardProps) => {
  const hasExpiresAt = Boolean(premiumInfo.expiresAt);
  const time = premiumInfo.expiresAt ? calculateTimeRemaining(premiumInfo.expiresAt) : null;
  const remainingDays = time ? time.days + time.hours / 24 : premiumInfo.balanceDays ?? 0;
  const totalDays = premiumInfo.balanceDays && premiumInfo.balanceDays > 0 ? premiumInfo.balanceDays : remainingDays;
  const progressPercent = totalDays > 0 ? Math.min(100, Math.round((remainingDays / totalDays) * 100)) : 0;
  const statusTone = remainingDays <= 2 ? "danger" : remainingDays <= 7 ? "warning" : "success";
  const statusLabel = remainingDays <= 2 ? "Expirando" : remainingDays <= 7 ? "Atenção" : "Ok";
  const timeLabel = time
    ? `${time.days}d ${time.hours}h ${time.minutes}m`
    : premiumInfo.balanceDays
      ? `${premiumInfo.balanceDays} dias`
      : "Não disponível";

  return (
    <section className={`card ${className ?? ""}`.trim()}>
      <div className="card-header">
        <div className="card-title-row">
          <span className="card-icon">
            <Clock className="card-icon__svg" aria-hidden="true" />
          </span>
          <h2 className="card-title">Premium Time</h2>
        </div>
        <span className={`badge badge-${statusTone}`}>{statusLabel}</span>
      </div>

      <div className="card-content premium-content">
        <div className="premium-hero">
          <div className="stat-label">Tempo Restante</div>
          <div className="big-number" style={{ color: statusTone === "success" ? "var(--success)" : statusTone === "warning" ? "var(--warning)" : "var(--danger)" }}>
            {timeLabel}
          </div>
        </div>

        <div className="stat-stack">
          <div className="stat-card">
            <span className="stat-label">Expira em</span>
            <span className="stat-value">
              {hasExpiresAt && premiumInfo.expiresAt
                ? premiumInfo.expiresAt.toLocaleString("pt-BR")
                : "Não disponível"}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Saldo (dias)</span>
            <span className="stat-value">{premiumInfo.balanceDays ?? "Não disponível"}</span>
          </div>
        </div>

        <div className="progress-bar premium-progress-bar">
          <div
            className={`progress-bar__fill progress-${statusTone} premium-progress`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
};
