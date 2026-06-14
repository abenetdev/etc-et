import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Store,
  MoreVertical,
  Eye,
  ExternalLink,
  Ban,
  CheckCircle,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import {
  fetchAllVendors,
  getVendorById,
  updateVendorStoreStatus,
  clearVendorDetails,
} from "@/store/admin/vendors-slice";

const fmt = (n) =>
  `ETB ${(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function StoreStatusBadge({ store }) {
  if (!store) {
    return <Badge variant="secondary">No Store</Badge>;
  }
  if (store.status === "active") {
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  }
  return <Badge className="bg-orange-100 text-orange-800">Closed</Badge>;
}

export default function AdminVendors() {
  const dispatch = useDispatch();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { vendorList, vendorDetails, isListLoading, isSubmitting } =
    useSelector((s) => s.adminVendors);

  useEffect(() => {
    dispatch(fetchAllVendors({ search: searchTerm, storeStatus: filterStatus }));
  }, [dispatch, filterStatus]);

  const handleSearch = () => {
    dispatch(fetchAllVendors({ search: searchTerm, storeStatus: filterStatus }));
  };

  const handleViewDetails = (vendorId) => {
    dispatch(getVendorById(vendorId));
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    dispatch(clearVendorDetails());
  };

  const handleToggleStoreStatus = async (vendorId, currentStatus) => {
    const newStatus =
      currentStatus === "active" ? "temporarily-closed" : "active";

    const result = await dispatch(
      updateVendorStoreStatus({ vendorId, status: newStatus })
    );

    if (result?.payload?.success) {
      toast({ title: result.payload.message });
      dispatch(fetchAllVendors({ search: searchTerm, storeStatus: filterStatus }));
      if (detailsOpen && vendorDetails?._id === vendorId) {
        dispatch(getVendorById(vendorId));
      }
    } else {
      toast({
        title: "Update failed",
        description: result?.payload?.message || "Could not update store status",
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: vendorList.length,
    active: vendorList.filter((v) => v.store?.status === "active").length,
    closed: vendorList.filter((v) => v.store?.status === "temporarily-closed").length,
    noStore: vendorList.filter((v) => !v.store).length,
  };

  return (
    <Fragment>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <p className="text-muted-foreground">
          Manage marketplace sellers and their stores
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Temporarily Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.closed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">No Store Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.noStore}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Search
        </Button>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Store status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            <SelectItem value="active">Active Stores</SelectItem>
            <SelectItem value="temporarily-closed">Closed Stores</SelectItem>
            <SelectItem value="no-store">No Store</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isListLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading vendors...
                </TableCell>
              </TableRow>
            ) : vendorList.length > 0 ? (
              vendorList.map((vendor) => (
                <TableRow key={vendor._id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{vendor.userName}</div>
                      <div className="text-sm text-muted-foreground">{vendor.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vendor.store ? (
                      <div>
                        <div className="font-medium">{vendor.store.storeName}</div>
                        <div className="text-xs text-muted-foreground">/{vendor.store.slug}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StoreStatusBadge store={vendor.store} />
                  </TableCell>
                  <TableCell>{vendor.stats?.totalProducts ?? 0}</TableCell>
                  <TableCell>{vendor.stats?.totalOrders ?? 0}</TableCell>
                  <TableCell>{fmt(vendor.stats?.totalRevenue)}</TableCell>
                  <TableCell className="text-sm">{formatDate(vendor.joinedAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(vendor._id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {vendor.store?.slug && (
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/store/${vendor.store.slug}`, "_blank")
                            }
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Storefront
                          </DropdownMenuItem>
                        )}
                        {vendor.store && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStoreStatus(vendor._id, vendor.store.status)
                            }
                            className="gap-2"
                          >
                            {vendor.store.status === "active" ? (
                              <>
                                <Ban className="h-4 w-4" />
                                Close Store
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Activate Store
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Store className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No vendors found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsOpen} onOpenChange={handleCloseDetails}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>

          {isSubmitting && !vendorDetails ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : vendorDetails ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Vendor</p>
                <p className="font-semibold">{vendorDetails.userName}</p>
                <p className="text-sm">{vendorDetails.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Joined {formatDate(vendorDetails.joinedAt)}
                </p>
              </div>

              {vendorDetails.store ? (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{vendorDetails.store.storeName}</p>
                    <StoreStatusBadge store={vendorDetails.store} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    /{vendorDetails.store.slug}
                  </p>
                  {vendorDetails.store.businessCategory && (
                    <p className="text-sm capitalize">
                      Category: {vendorDetails.store.businessCategory.replace("-", " ")}
                    </p>
                  )}
                  {(vendorDetails.store.city || vendorDetails.store.phone) && (
                    <p className="text-sm text-muted-foreground">
                      {[vendorDetails.store.city, vendorDetails.store.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(`/store/${vendorDetails.store.slug}`, "_blank")
                      }
                      className="gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Storefront
                    </Button>
                    <Button
                      size="sm"
                      variant={vendorDetails.store.status === "active" ? "destructive" : "default"}
                      onClick={() =>
                        handleToggleStoreStatus(
                          vendorDetails._id,
                          vendorDetails.store.status
                        )
                      }
                      disabled={isSubmitting}
                    >
                      {vendorDetails.store.status === "active"
                        ? "Close Store"
                        : "Activate Store"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground rounded-lg border p-4">
                  This vendor has not set up a store yet.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Products
                  </div>
                  <p className="text-xl font-bold mt-1">
                    {vendorDetails.stats?.totalProducts ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {vendorDetails.stats?.activeProducts ?? 0} active
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" />
                    Orders
                  </div>
                  <p className="text-xl font-bold mt-1">
                    {vendorDetails.stats?.totalOrders ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(vendorDetails.stats?.totalRevenue)} revenue
                  </p>
                </div>
                <div className="rounded-lg border p-3 col-span-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    Wallet
                  </div>
                  <div className="flex gap-6 mt-1">
                    <div>
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="font-semibold text-green-600">
                        {fmt(vendorDetails.stats?.availableBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="font-semibold text-orange-600">
                        {fmt(vendorDetails.stats?.pendingBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {vendorDetails.recentOrders?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Orders</p>
                  <div className="space-y-2">
                    {vendorDetails.recentOrders.map((order) => (
                      <div
                        key={order._id}
                        className="flex items-center justify-between text-sm rounded border px-3 py-2"
                      >
                        <span className="font-mono text-xs">{order.orderId}</span>
                        <span>{fmt(order.totalAmount)}</span>
                        <Badge variant="secondary">{order.orderStatus}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
