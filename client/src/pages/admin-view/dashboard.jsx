import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAdminDashboardData } from "@/store/admin/dashboard-slice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Store,
  Package,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Bell,
  BarChart3,
} from "lucide-react";

const fmt = (n) =>
  `ETB ${(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const StatusBadge = ({ status }) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <Badge className={map[status] || "bg-gray-100 text-gray-800"}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { data, isLoading, error } = useSelector((s) => s.adminDashboard);

  useEffect(() => {
    dispatch(getAdminDashboardData());
  }, [dispatch]);

  const refresh = () => dispatch(getAdminDashboardData());

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const {
    overview = {},
    salesPerformance = {},
    orderStatusSummary = {},
    topVendors = [],
    recentOrders = [],
    notifications = [],
  } = data || {};

  const overviewCards = [
    { label: "Total Revenue", value: fmt(overview.totalRevenue), icon: TrendingUp },
    { label: "Total Orders", value: overview.totalOrders ?? 0, icon: ShoppingBag },
    { label: "Paid Orders", value: overview.paidOrders ?? 0, icon: BarChart3 },
    { label: "Vendors", value: overview.totalVendors ?? 0, icon: Store },
    { label: "Customers", value: overview.totalCustomers ?? 0, icon: Users },
    { label: "Products", value: overview.totalProducts ?? 0, icon: Package },
    { label: "Active Stores", value: overview.activeStores ?? 0, icon: Store },
    {
      label: "Platform Commission",
      value: fmt(overview.platformCommission),
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and marketplace performance
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                n.level === "warning"
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span>{n.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(salesPerformance.today)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(salesPerformance.thisWeek)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(salesPerformance.thisMonth)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="text-sm">{order.vendorName}</TableCell>
                      <TableCell>{fmt(order.totalAmount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.orderStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No orders yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topVendors.length > 0 ? (
                  topVendors.map((vendor) => (
                    <TableRow key={vendor.vendorId}>
                      <TableCell className="font-medium">{vendor.storeName}</TableCell>
                      <TableCell>{vendor.orderCount}</TableCell>
                      <TableCell>{fmt(vendor.revenue)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No vendor sales yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(orderStatusSummary).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 rounded-lg border px-4 py-2"
              >
                <StatusBadge status={status} />
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
