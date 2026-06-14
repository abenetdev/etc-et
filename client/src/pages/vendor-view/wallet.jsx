import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Wallet as WalletIcon,
  DollarSign,
  TrendingUp,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
} from "lucide-react";
import {
  getWallet,
  getTransactions,
  getWithdrawals,
  requestWithdrawal,
  getEarningsBreakdown,
} from "@/store/vendor/wallet-slice";

// ── Helpers ────────────────────────────────────────────────────────────────
const formatCurrency = (amount) => `ETB ${amount?.toFixed(2) || "0.00"}`;

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Status Badges ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    PENDING:   { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    COMPLETED: { color: "bg-green-100 text-green-800",   label: "Completed" },
    FAILED:    { color: "bg-red-100 text-red-800",       label: "Failed" },
    CANCELLED: { color: "bg-gray-100 text-gray-800",     label: "Cancelled" },
    APPROVED:  { color: "bg-blue-100 text-blue-800",     label: "Approved" },
    REJECTED:  { color: "bg-red-100 text-red-800",       label: "Rejected" },
    PAID:      { color: "bg-green-100 text-green-800",   label: "Paid" },
  };

  const { color, label } = config[status] || config.PENDING;
  return <Badge className={color}>{label}</Badge>;
};

const TypeBadge = ({ type }) => {
  const config = {
    SALE:       { color: "bg-green-100 text-green-800",   icon: ArrowUpRight },
    COMMISSION: { color: "bg-orange-100 text-orange-800", icon: ArrowDownRight },
    REFUND:     { color: "bg-red-100 text-red-800",       icon: ArrowDownRight },
    WITHDRAWAL: { color: "bg-blue-100 text-blue-800",     icon: Download },
    ADJUSTMENT: { color: "bg-purple-100 text-purple-800", icon: null },
  };

  const { color, icon: Icon } = config[type] || {};
  return (
    <Badge className={`${color} gap-1`}>
      {Icon && <Icon className="h-3 w-3" />}
      {type}
    </Badge>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function VendorWallet() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSelector((state) => state.auth);
  const { wallet, transactions, withdrawals, earningsBreakdown, isLoading } = useSelector(
    (state) => state.vendorWallet
  );

  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const vendorId = user?._id || user?.id;

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (vendorId) {
      dispatch(getWallet(vendorId));
      dispatch(getTransactions({ vendorId }));
      dispatch(getWithdrawals({ vendorId }));
      dispatch(getEarningsBreakdown(vendorId));
    }
  }, [dispatch, vendorId]);

  // ── Withdraw handler ───────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      return toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
    }

    const result = await dispatch(requestWithdrawal({ vendorId, amount }));

    if (result?.payload?.success) {
      toast({
        title: "Withdrawal Requested!",
        description: result.payload.message,
      });
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      dispatch(getWallet(vendorId));
      dispatch(getWithdrawals({ vendorId }));
      dispatch(getTransactions({ vendorId }));
    } else {
      toast({
        title: "Withdrawal Failed",
        description: result?.payload?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  // ── Filter transactions ────────────────────────────────────────────────────
  const filteredTransactions =
    filterStatus === "all"
      ? transactions
      : transactions?.filter((t) => t.status === filterStatus.toUpperCase());

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading && !wallet) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet & Earnings</h1>
          <p className="text-muted-foreground">Track your revenue and manage withdrawals</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/vendor/payout-settings")}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Payout Settings
          </Button>
          <Button
            onClick={() => setWithdrawDialogOpen(true)}
            className="gap-2"
            disabled={!wallet || wallet.availableBalance <= 0}
          >
            <Download className="h-4 w-4" />
            Request Withdrawal
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(wallet?.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(wallet?.availableBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready for withdrawal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(wallet?.pendingBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In escrow — released after customer confirms & admin approves
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Withdrawn</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(wallet?.withdrawnAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {wallet?.totalOrders || 0} orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          {earningsBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Gross Sales</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(earningsBreakdown.grossSales)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Platform Fees ({earningsBreakdown.commissionRate}%)
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(earningsBreakdown.platformFees)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold">Net Earnings</span>
                  <span className="font-bold text-xl text-green-600">
                    {formatCurrency(earningsBreakdown.netEarnings)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 5).map((txn) => (
                      <TableRow key={txn._id}>
                        <TableCell className="text-sm">{formatDate(txn.createdAt)}</TableCell>
                        <TableCell>
                          <TypeBadge type={txn.type} />
                        </TableCell>
                        <TableCell
                          className={`font-medium ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {txn.amount >= 0 ? "+" : ""}
                          {formatCurrency(txn.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={txn.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No transactions yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Transactions ─────────────────────────────────────────────── */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions && filteredTransactions.length > 0 ? (
                    filteredTransactions.map((txn) => (
                      <TableRow key={txn._id}>
                        <TableCell className="font-mono text-xs">
                          {txn._id?.slice(-8).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(txn.createdAt)}</TableCell>
                        <TableCell>
                          <TypeBadge type={txn.type} />
                        </TableCell>
                        <TableCell
                          className={`font-medium ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {txn.amount >= 0 ? "+" : ""}
                          {formatCurrency(txn.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={txn.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                          {txn.description || txn.reference || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">No transactions found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Withdrawals ──────────────────────────────────────────────── */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals && withdrawals.length > 0 ? (
                    withdrawals.map((w) => (
                      <TableRow key={w._id}>
                        <TableCell className="font-mono text-xs">
                          WD-{w._id?.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(w.requestedAt)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(w.amount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={w.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          {w.status === "REJECTED" && w.adminNote ? (
                            <span className="text-red-600">{w.adminNote}</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {w.processedAt ? formatDate(w.processedAt) : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">No withdrawal requests</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Withdraw Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Minimum withdrawal: ETB 100.00
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(wallet?.availableBalance)}
              </p>
            </div>

            <div>
              <Label>Withdrawal Amount (ETB)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Make sure you have configured your payout settings before requesting a withdrawal.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} className="gap-2">
              <Download className="h-4 w-4" />
              Request Withdrawal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
