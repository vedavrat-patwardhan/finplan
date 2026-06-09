import { deleteInvestmentAction } from "@/actions/finance";
import {
  formatDate,
  formatFrequency,
  formatINR,
  formatInvestmentType,
  formatPercent,
} from "@/lib/format";
import { isLumpSumInvestment } from "@/lib/finance/investment-metrics";
import type { InvestmentMetrics } from "@/lib/finance/investment-metrics";
import { chartColorAt } from "@/lib/finance/chart-colors";
import type { Frequency } from "@/lib/finance/constants";

const investmentTypeColorIndex: Record<string, number> = {
  mutual_fund: 0,
  sip: 1,
  stocks: 5,
  crypto: 4,
  lump_sum: 3,
  ppf: 6,
  nps: 7,
};
import { InvestmentFormSheet } from "@/components/finance/investment-form-sheet";
import { ResourceBadge } from "@/components/finance/resource-row";
import { DeleteButton } from "@/components/finance/resource-form-sheet";

export interface InvestmentListItem {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: Frequency;
  expectedReturnPct: number;
  absoluteReturnPct?: number;
  monthlyWithdrawalPct?: number;
  startDate: Date | string;
  deductionDay?: number;
  lastPaidDate?: Date | string;
  notes?: string;
  metrics: InvestmentMetrics;
}

function formatPaymentDate(date: Date | null): string {
  return date ? formatDate(date) : "—";
}

function formatInvestmentSubtitle(item: InvestmentListItem): string {
  const isLumpSum = isLumpSumInvestment(item.type);
  const parts: string[] = [`Started ${formatDate(item.startDate)}`];

  if (isLumpSum && item.monthlyWithdrawalPct != null) {
    parts.push(`${formatPercent(item.monthlyWithdrawalPct)} withdrawn monthly`);
  } else if (!isLumpSum) {
    parts.push(formatFrequency(item.frequency));
    if (item.metrics.lastPaidOn) {
      parts.push(`Last paid ${formatDate(item.metrics.lastPaidOn)}`);
    }
    if (item.metrics.nextPaymentOn) {
      parts.push(`Next ${formatDate(item.metrics.nextPaymentOn)}`);
    }
  }

  if (
    (isLumpSum && !item.monthlyWithdrawalPct && item.expectedReturnPct) ||
    (!isLumpSum && item.expectedReturnPct)
  ) {
    parts.push(`${item.expectedReturnPct}% expected p.a.`);
  }

  return parts.join(" · ");
}

function formatInvestmentAmountSub(item: InvestmentListItem): string {
  const isLumpSum = isLumpSumInvestment(item.type);
  const { metrics } = item;

  if (isLumpSum && metrics.isLumpSumWithdrawal) {
    return metrics.monthlyWithdrawalAmount != null
      ? `${formatINR(metrics.monthlyWithdrawalAmount)}/mo to bank`
      : "Lump sum principal";
  }

  if (isLumpSum) {
    return "Lump sum · principal invested once";
  }

  if (item.frequency === "monthly") {
    return `${formatFrequency(item.frequency)} · ${formatINR(item.amount)}/mo`;
  }

  return `${formatFrequency(item.frequency)} · ${formatINR(item.amount)} per payment`;
}

export function InvestmentCard({ item }: { item: InvestmentListItem }) {
  const { metrics } = item;
  const isLumpSum = isLumpSumInvestment(item.type);
  const isWithdrawalLumpSum = isLumpSum && metrics.isLumpSumWithdrawal;
  const isGrowthLumpSum = isLumpSum && !metrics.isLumpSumWithdrawal;

  const accent = chartColorAt(investmentTypeColorIndex[item.type] ?? 0);

  return (
    <article
      className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5"
      style={{ borderLeftWidth: 3, borderLeftColor: accent }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 sm:block">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium leading-snug">{item.name}</p>
                <ResourceBadge>{formatInvestmentType(item.type)}</ResourceBadge>
              </div>
            </div>
            <div className="shrink-0 text-right sm:hidden">
              <p className="font-medium tabular-nums">{formatINR(item.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {formatInvestmentAmountSub(item)}
              </p>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatInvestmentSubtitle(item)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-4">
          <div className="hidden text-right sm:block">
            <p className="font-medium tabular-nums">{formatINR(item.amount)}</p>
            <p className="text-xs text-muted-foreground">
              {formatInvestmentAmountSub(item)}
            </p>
          </div>
          <div className="flex items-center">
            <InvestmentFormSheet investment={item} />
            <DeleteButton
              id={item.id}
              action={deleteInvestmentAction}
              itemName={item.name}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label={isLumpSum ? "Principal" : "Total invested"}
          value={formatINR(metrics.totalInvested || item.amount)}
        />
        <Metric
          label="Fund value"
          value={
            metrics.fundValue != null
              ? formatINR(metrics.fundValue)
              : isGrowthLumpSum
                ? "Add return or value"
                : isWithdrawalLumpSum
                  ? formatINR(item.amount)
                  : "Add return or value"
          }
          muted={metrics.fundValue == null && isGrowthLumpSum}
        />
        {isWithdrawalLumpSum ? (
          <Metric
            label="Monthly withdrawal"
            value={
              metrics.monthlyWithdrawalPct != null
                ? formatPercent(metrics.monthlyWithdrawalPct)
                : "—"
            }
            sub={
              metrics.monthlyWithdrawalAmount != null
                ? `${formatINR(metrics.monthlyWithdrawalAmount)} to bank`
                : undefined
            }
            muted={metrics.monthlyWithdrawalPct == null}
          />
        ) : (
          <Metric
            label="Absolute return"
            value={
              metrics.absoluteReturnPct != null
                ? formatPercent(metrics.absoluteReturnPct)
                : "—"
            }
            muted={metrics.absoluteReturnPct == null}
          />
        )}
        {isWithdrawalLumpSum ? (
          <Metric
            label="Next withdrawal"
            value={formatPaymentDate(metrics.nextPaymentOn)}
          />
        ) : isGrowthLumpSum ? (
          <Metric
            label="Gain"
            value={
              metrics.gainAmount != null ? formatINR(metrics.gainAmount) : "—"
            }
            muted={metrics.gainAmount == null}
          />
        ) : (
          <Metric
            label="Last paid on"
            value={formatPaymentDate(metrics.lastPaidOn)}
            sub={
              metrics.nextPaymentOn
                ? `Next ${formatDate(metrics.nextPaymentOn)}`
                : undefined
            }
          />
        )}
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  sub,
  muted = false,
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-medium tabular-nums ${muted ? "text-muted-foreground" : ""}`}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
