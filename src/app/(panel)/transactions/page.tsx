"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import * as React from "react";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Card,
  CardBody,
  EmptyState,
  Field,
  LoadingBlock,
  Pagination,
  Select,
} from "@/components/ui";
import { adminWalletApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  TRANSACTION_REASON_LABELS,
  formatCoins,
  formatPaise,
  type TransactionDirection,
  type TransactionReason,
} from "@/types";

export default function TransactionsPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });

  const [page, setPage] = React.useState(1);
  const [reason, setReason] = React.useState<TransactionReason | "">("");
  const [direction, setDirection] = React.useState<TransactionDirection | "">("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "transactions", page, reason, direction],
    queryFn: () =>
      adminWalletApi.transactions({
        page,
        limit: 25,
        reason: reason || undefined,
        direction: direction || undefined,
      }),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  if (!ready) return <LoadingBlock />;

  return (
    <>
      <PanelHeader
        title="Transactions"
        description="Every movement of money, newest first. Rows are never edited or deleted."
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap gap-4">
          <Field label="Reason" className="w-48">
            <Select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as TransactionReason | "");
                setPage(1);
              }}
            >
              <option value="">All reasons</option>
              {Object.entries(TRANSACTION_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Direction" className="w-40">
            <Select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value as TransactionDirection | "");
                setPage(1);
              }}
            >
              <option value="">Both</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      {error ? (
        <Alert tone="error">{(error as ApiError).message}</Alert>
      ) : isLoading && !data ? (
        <LoadingBlock label="Loading transactions…" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nothing to show"
          description="No transaction matches these filters."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-3 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Reason</th>
                  <th className="px-3 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-right">Balance after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((txn) => {
                  const isCredit = txn.direction === "credit";
                  return (
                    <tr key={txn.id} className="hover:bg-surface-muted/50">
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(txn.created_at)}
                      </td>
                      <td className="px-3 py-3">{txn.user_email ?? "—"}</td>
                      <td className="px-3 py-3">
                        <p>{TRANSACTION_REASON_LABELS[txn.reason]}</p>
                        {txn.note && (
                          <p className="text-xs text-muted-foreground">{txn.note}</p>
                        )}
                        {txn.created_by && (
                          <p className="text-xs text-muted-foreground">by an admin</p>
                        )}
                        {txn.amount_paise != null && (
                          <p className="text-xs text-muted-foreground">
                            paid {formatPaise(txn.amount_paise)}
                            {txn.coins_per_rupee != null &&
                              ` at ${txn.coins_per_rupee}/₹`}
                          </p>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap",
                          isCredit ? "text-success" : "text-warning",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isCredit ? (
                            <ArrowDownLeft className="size-3.5" />
                          ) : (
                            <ArrowUpRight className="size-3.5" />
                          )}
                          {formatCoins(txn.amount_coins)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                        {formatCoins(txn.balance_after_coins)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <CardBody>
            <Pagination meta={data.meta} onPage={setPage} />
          </CardBody>
        </Card>
      )}
    </>
  );
}
