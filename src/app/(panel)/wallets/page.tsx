"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Scale, Search, Snowflake, Wallet } from "lucide-react";
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
  Input,
  LoadingBlock,
  Modal,
  Pagination,
  Select,
  Textarea,
} from "@/components/ui";
import { adminWalletApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { useRequireAuth } from "@/providers/auth-provider";
import {
  formatPaise,
  rupeesToPaise,
  type AdminWallet,
  type TransactionDirection,
} from "@/types";

export default function WalletsPage() {
  const { ready } = useRequireAuth({ roles: ["admin", "super_admin"], signInPath: "/login" });
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [adjusting, setAdjusting] = React.useState<AdminWallet | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "wallets", debounced, page],
    queryFn: () => adminWalletApi.list({ search: debounced || undefined, page, limit: 20 }),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });

  const freeze = useMutation({
    mutationFn: ({ userId, frozen }: { userId: string; frozen: boolean }) =>
      adminWalletApi.freeze(userId, {
        frozen,
        reason: frozen ? "Frozen by an admin" : null,
      }),
    onSuccess: (_result, variables) => {
      void refresh();
      toast.success(variables.frozen ? "Wallet frozen." : "Wallet unfrozen.");
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const reconcile = useMutation({
    mutationFn: (userId: string) => adminWalletApi.reconcile(userId),
    onSuccess: (result) => {
      void refresh();
      toast.success(
        result.drift_paise === 0
          ? "Balance matches the ledger."
          : `Repaired a drift of ${formatPaise(Math.abs(result.drift_paise))}.`,
      );
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  if (!ready) return <LoadingBlock />;

  return (
    <>
      <PanelHeader
        title="Wallets"
        description="Balances are derived from the ledger, so they can always be rebuilt."
      />

      <Card className="mb-6">
        <CardBody>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {error ? (
        <Alert tone="error">{(error as ApiError).message}</Alert>
      ) : isLoading && !data ? (
        <LoadingBlock label="Loading wallets…" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No wallets yet"
          description="A wallet opens the first time a user needs one."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium text-right">Balance</th>
                  <th className="px-3 py-3 font-medium">Last activity</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((wallet) => (
                  <tr key={wallet.user_id} className="hover:bg-surface-muted/50">
                    <td className="px-5 py-3">
                      <p className="font-medium">{wallet.name}</p>
                      <p className="text-xs text-muted-foreground">{wallet.email}</p>
                      {wallet.is_frozen && (
                        <Badge tone="red" className="mt-1">
                          <Snowflake className="size-3" /> Frozen
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {formatPaise(wallet.balance_paise)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      {wallet.last_transaction_at
                        ? formatDateTime(wallet.last_transaction_at)
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setAdjusting(wallet)}
                        >
                          Adjust
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Rebuild the balance from the ledger"
                          disabled={reconcile.isPending}
                          onClick={() => reconcile.mutate(wallet.user_id)}
                        >
                          <Scale className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            freeze.mutate({
                              userId: wallet.user_id,
                              frozen: !wallet.is_frozen,
                            })
                          }
                        >
                          {wallet.is_frozen ? "Unfreeze" : "Freeze"}
                        </Button>
                      </div>
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

      <AdjustModal wallet={adjusting} onClose={() => setAdjusting(null)} onDone={refresh} />
    </>
  );
}

/** Manual money movement. The reason is required — an unexplained adjustment
 *  is impossible to audit later. */
function AdjustModal({
  wallet,
  onClose,
  onDone,
}: {
  wallet: AdminWallet | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [direction, setDirection] = React.useState<TransactionDirection>("credit");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (wallet) {
      setDirection("credit");
      setAmount("");
      setReason("");
      setFieldError(null);
    }
  }, [wallet]);

  const adjust = useMutation({
    mutationFn: () =>
      adminWalletApi.adjust(wallet!.user_id, {
        direction,
        amount_paise: rupeesToPaise(Number(amount)),
        reason: reason.trim(),
      }),
    onSuccess: (balance) => {
      onDone();
      onClose();
      toast.success(`Balance is now ${formatPaise(balance.balance_paise)}.`);
    },
    onError: (e: ApiError) => {
      setFieldError(e.message);
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldError(null);

    const rupees = Number(amount);
    if (!amount.trim() || Number.isNaN(rupees) || rupees <= 0) {
      setFieldError("Enter an amount.");
      return;
    }
    if (reason.trim().length < 3) {
      setFieldError("Say why — this is recorded against your account.");
      return;
    }
    adjust.mutate();
  }

  return (
    <Modal
      open={Boolean(wallet)}
      onClose={onClose}
      title="Adjust wallet"
      description={
        wallet
          ? `${wallet.name} · balance ${formatPaise(wallet.balance_paise)}`
          : undefined
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Direction">
          <Select
            value={direction}
            onChange={(e) => setDirection(e.target.value as TransactionDirection)}
          >
            <option value="credit">Credit — add money</option>
            <option value="debit">Debit — take money out</option>
          </Select>
        </Field>

        <Field label="Amount (₹)" required>
          <Input
            type="number"
            min={1}
            step="0.01"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field
          label="Reason"
          required
          hint="Stored on the ledger row along with your name."
        >
          <Textarea
            rows={2}
            placeholder="Refund for a dropped call"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>

        {fieldError && <Alert tone="error">{fieldError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={adjust.isPending}>
            {adjust.isPending && <Loader2 className="size-4 animate-spin" />}
            Apply
          </Button>
        </div>
      </form>
    </Modal>
  );
}
