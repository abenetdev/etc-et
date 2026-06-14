import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Package, MapPin, CreditCard, User, XCircle } from "lucide-react";
import {
  getOrderDetailsForVendor,
  updateOrderStatus,
  getAllOrdersForVendor,
} from "@/store/vendor/order-slice";

function VendorOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useToast();
  
  const [selectedStatus, setSelectedStatus] = useState("");
  const { orderDetails, isSubmitting } = useSelector((state) => state.vendorOrder);

  useEffect(() => {
    if (orderId) {
      dispatch(getOrderDetailsForVendor(orderId));
    }
  }, [dispatch, orderId]);

  useEffect(() => {
    if (orderDetails) {
      setSelectedStatus(orderDetails.orderStatus);
    }
  }, [orderDetails]);

  const handleStatusUpdate = () => {
    if (selectedStatus === orderDetails.orderStatus) {
      toast({
        title: "No changes detected",
        description: "Status is already set to this value",
      });
      return;
    }

    dispatch(updateOrderStatus({ id: orderId, orderStatus: selectedStatus }))
      .then((data) => {
        if (data?.payload?.success) {
          toast({
            title: "Status updated",
            description: "Order status has been updated successfully",
          });
          dispatch(getOrderDetailsForVendor(orderId));
          dispatch(getAllOrdersForVendor({}));
        } else {
          toast({
            title: "Update failed",
            description: data?.payload?.message || "Failed to update status",
            variant: "destructive",
          });
        }
      });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending:    { className: "bg-yellow-100 text-yellow-800" },
      confirmed:  { className: "bg-blue-100 text-blue-800" },
      processing: { className: "bg-indigo-100 text-indigo-800" },
      shipped:    { className: "bg-purple-100 text-purple-800" },
      delivered:  { className: "bg-green-100 text-green-800" },
      cancelled:  { className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Badge className={config.className}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!orderDetails) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg">
            {isSubmitting ? "Loading order details..." : "Order not found"}
          </div>
          {!isSubmitting && (
            <Button onClick={() => navigate("/vendor/orders")} className="mt-4">
              Back to Orders
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/vendor/orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order Details</h1>
            <p className="text-muted-foreground">
              Order #{orderDetails._id?.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
        {getStatusBadge(orderDetails.orderStatus)}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Order Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderDetails.cartItems?.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="h-20 w-20 rounded border overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    <div className="text-sm text-muted-foreground mt-1">
                      Quantity: {item.quantity}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      ${item.price} × {item.quantity} = $
                      {(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${orderDetails.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${orderDetails.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Info Sidebar */}
        <div className="space-y-6">
          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleStatusUpdate} 
                className="w-full"
                disabled={selectedStatus === orderDetails.orderStatus}
              >
                Update Status
              </Button>
              {orderDetails.paymentStatus === "paid" && !orderDetails.escrowReleased && (
                <p className="text-xs text-muted-foreground">
                  After you mark delivered, the customer must confirm receipt. Then an admin
                  reviews and releases your earnings from escrow to available balance.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <div className="font-medium">{orderDetails.customerName}</div>
                <div className="text-muted-foreground">
                  {orderDetails.userId?.email || "N/A"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>{orderDetails.addressInfo?.address}</div>
              <div>{orderDetails.addressInfo?.city}</div>
              <div>{orderDetails.addressInfo?.pincode}</div>
              <div>Phone: {orderDetails.addressInfo?.phone}</div>
              {orderDetails.addressInfo?.notes && (
                <div className="text-muted-foreground mt-2">
                  Note: {orderDetails.addressInfo.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium capitalize">
                  {orderDetails.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={orderDetails.paymentStatus === "paid" ? "default" : "secondary"}>
                  {orderDetails.paymentStatus}
                </Badge>
              </div>
              {orderDetails.paymentStatus === "paid" && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payout</span>
                  {orderDetails.escrowReleased ? (
                    <Badge className="bg-green-100 text-green-800">Funds released</Badge>
                  ) : orderDetails.escrowRejected ? (
                    <Badge className="bg-red-100 text-red-800">Release rejected</Badge>
                  ) : orderDetails.deliveryConfirmedByCustomer ? (
                    <Badge className="bg-blue-100 text-blue-800">Customer confirmed — admin review</Badge>
                  ) : orderDetails.orderStatus === "delivered" ? (
                    <Badge className="bg-orange-100 text-orange-800">Awaiting customer confirmation</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800">In escrow</Badge>
                  )}
                </div>
              )}
              {orderDetails.escrowRejected && orderDetails.escrowRejectionNote && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-red-800">
                    <XCircle className="h-4 w-4" />
                    Admin rejected payout release
                  </div>
                  <p className="mt-2 text-red-700">{orderDetails.escrowRejectionNote}</p>
                  {orderDetails.escrowRejectedAt && (
                    <p className="mt-1 text-xs text-red-600">
                      {formatDate(orderDetails.escrowRejectedAt)}
                    </p>
                  )}
                </div>
              )}
              {orderDetails.paymentId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID</span>
                  <span className="font-mono text-xs">
                    {orderDetails.paymentId.slice(0, 12)}...
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <div className="text-muted-foreground">Order Placed</div>
                <div className="font-medium">{formatDate(orderDetails.orderDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Updated</div>
                <div className="font-medium">
                  {formatDate(orderDetails.orderUpdateDate)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default VendorOrderDetails;
