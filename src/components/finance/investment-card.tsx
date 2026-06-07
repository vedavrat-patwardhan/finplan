import { deleteInvestmentAction } from "@/actions/finance";
import {
  formatDate,
  formatDeductionDay,
  formatFrequency,
  formatINR,
  formatInvestmentType,
  formatPercent,
} from "@/lib/format";
import { toMonthlyEquivalent } from "@/lib/finance/engine";
import { isLumpSumInvestment } from "@/lib/finance/investment-metrics";
import type { InvestmentMetrics } from "@/lib/finance/investment-metrics";
import type { Frequency } from "@/lib/finance/constants";
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

export function InvestmentCard({ item }: { item: InvestmentListItem }) {
  const { metrics } = item;
  const isLumpSum = isLumpSumInvestment(item.type);
  const isWithdrawalLumpSum = isLumpSum && metrics.isLumpSumWithdrawal;
  const isGrowthLumpSum = isLumpSum && !metrics.isLumpSumWithdrawal;

  return (
    <article className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{item.name}</p>
            <ResourceBadge>{formatInvestmentType(item.type)}</ResourceBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Started {formatDate(item.startDate)}
            {isWithdrawalLumpSum && item.monthlyWithdrawalPct != null ? (
              <span>
                {" "}
                · {formatPercent(item.monthlyWithdrawalPct)} withdrawn monthly
              </span>
            ) : null}
            {isGrowthLumpSum && item.expectedReturnPct ? (
              <span> · {item.expectedReturnPct}% expected p.a.</span>
            ) : null}
            {!isLumpSum && item.deductionDay ? (
              <span> · Deducts on {formatDeductionDay(item.deductionDay)}</span>
            ) : null}
            {!isLumpSum && item.expectedReturnPct ? (
              <span> · {item.expectedReturnPct}% expected p.a.</span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <p className="font-medium tabular-nums">{formatINR(item.amount)}</p>
            <p className="text-xs text-muted-foreground">
              {isWithdrawalLumpSum ? (
                metrics.monthlyWithdrawalAmount != null ? (
                  <span>{formatINR(metrics.monthlyWithdrawalAmount)}/mo to bank</span>
                ) : (
                  <span>Lump sum principal</span>
                )
              ) : isGrowthLumpSum ? (
                <span>Lump sum · principal invested once</span>
              ) : (
                <span>
                  {formatFrequency(item.frequency)} ·{" "}
                  {formatINR(toMonthlyEquivalent(item.amount, item.frequency), {
                    compact: true,
                  })}
                  /mo
                </span>
              )}
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
