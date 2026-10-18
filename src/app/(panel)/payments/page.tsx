"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, RefreshCw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PanelHeader } from "@/components/layout/panel-shell";
import {
  Alert,
  Badge,
  Button,
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
import { formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  PAYMENT_STATUS_LABELS,
  formatCoins,
  formatPaise,
  type PaymentOrderStatus,
} from "@/types";

const TONE: Record<PaymentOrderStatus, "green" | "red" | "gold" | undefined> = {
  paid: "green",
  failed: "red",
  created: "gold",
  expired: undefined,
};

export default function PaymentsPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<PaymentOrderStatus | "">("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "payments", page, status],
    queryFn: () => adminWalletApi.payments({ page, limit: 25, status: status || undefined }),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  const reconcile = useMutation({
    mutationFn: (orderId: string) => adminWalletApi.reconcilePayment(orderId),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
      toast.success(`Order is ${PAYMENT_STATUS_LABELS[order.status].toLowerCase()}.`);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  if (!ready) return <LoadingBlock />;

  return (
    <>
      <PanelHeader
        title="Payments"
        description="Every recharge attempt, including the ones that never finished. Use this when someone says money left their bank but the wallet stayed empty."
      />

      <Card className="mb-6">
        <CardBody>
          <Field label="Status" className="w-52">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PaymentOrderStatus | "");
                setPage(1);
              }}
            >
              <option value="">All</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      {error ? (
        <Alert tone="error">{(error as ApiError).message}</Alert>
      ) : isLoading && !data ? (
        <LoadingBlock label="Loading payments…" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Recharge attempts will appear here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Started</th>
                  <th className="px-3 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium text-right">Amount</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-muted/50">
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-mono text-xs">{order.razorpay_order_id}</p>
                      {order.method && (
                        <p className="text-xs text-muted-foreground">{order.method}</p>
                      )}
                      {order.failure_reason && (
                        <p className="text-xs text-danger">{order.failure_reason}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <p className="font-semibold">{formatPaise(order.amount_paise)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCoins(order.coins)} coins at {order.coins_per_rupee}/₹
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={TONE[order.status]}>
                        {PAYMENT_STATUS_LABELS[order.status]}
                      </Badge>
                      {order.verified_via && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          via {order.verified_via}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {order.status === "created" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={reconcile.isPending}
                          onClick={() => reconcile.mutate(order.id)}
                          title="Ask Razorpay what happened to this order"
                        >
                          <RefreshCw className="size-3.5" />
                          Check
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
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
