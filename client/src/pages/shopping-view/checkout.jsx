import Address from "@/components/shopping-view/address";
import img from "../../assets/account.jpg";
import { useDispatch, useSelector } from "react-redux";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createNewOrder, resetCheckout } from "@/store/shop/order-slice";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CreditCard, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { currencyFormatter } from "@/utils";

function ShoppingCheckout() {
  const { cartItems }               = useSelector((s) => s.shopCart);
  const { user }                    = useSelector((s) => s.auth);
  const { checkoutUrl, isLoading }  = useSelector((s) => s.shopOrder);
  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);

  const dispatch  = useDispatch();
  const { toast } = useToast();

  // Calculate total
  const totalCartAmount =
    cartItems?.items?.length > 0
      ? cartItems.items.reduce((sum, item) => {
          const price = item.salePrice > 0 ? item.salePrice : item.price;
          return sum + price * item.quantity;
        }, 0)
      : 0;

  // Redirect when Chapa checkout URL is ready
  if (checkoutUrl) {
    window.location.href = checkoutUrl;
    return null;
  }

  async function handleInitiatePayment() {
    if (!cartItems?.items?.length) {
      toast({
        title: "Your cart is empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      });
      return;
    }

    if (!currentSelectedAddress) {
      toast({
        title: "No address selected",
        description: "Please select a delivery address to continue",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      userId:            user?.id,
      cartId:            cartItems?._id,
      cartItems:         cartItems.items.map((item) => ({
        productId: item.productId,
        title:     item.title,
        image:     item.image,
        price:     item.salePrice > 0 ? item.salePrice : item.price,
        quantity:  item.quantity,
      })),
      addressInfo: {
        addressId: currentSelectedAddress?._id,
        address:   currentSelectedAddress?.address,
        city:      currentSelectedAddress?.city,
        pincode:   currentSelectedAddress?.pincode,
        phone:     currentSelectedAddress?.phone,
        notes:     currentSelectedAddress?.notes,
      },
      totalAmount:       totalCartAmount,
      // Customer info for Chapa
      customerEmail:     user?.email     || "customer@example.com",
      customerFirstName: user?.userName  || "Customer",
      customerLastName:  "",
    };

    dispatch(createNewOrder(orderData)).then((data) => {
      if (!data?.payload?.success) {
        toast({
          title: "Payment initialization failed",
          description: data?.payload?.message || "Please try again",
          variant: "destructive",
        });
        dispatch(resetCheckout());
      }
      // On success, `checkoutUrl` in Redux state triggers the redirect above
    });
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      {/* <div className="relative h-[200px] w-full overflow-hidden">
        <img src={img} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-white text-3xl font-bold">Checkout</h1>
        </div>
      </div> */}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Address */}
          <Address
            selectedId={currentSelectedAddress}
            setCurrentSelectedAddress={setCurrentSelectedAddress}
          />

          {/* Right: Order Summary */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order Summary
                </h2>

                <div className="space-y-3">
                  {cartItems?.items?.map((item) => (
                    <UserCartItemsContent key={item.productId} cartItem={item} />
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>ETB {totalCartAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>ETB {currencyFormatter(totalCartAmount)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleInitiatePayment}
                  className="w-full mt-6 gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting to Chapa...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pay with Chapa (ETB {currencyFormatter(totalCartAmount)})
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-3">
                  You will be redirected to Chapa to complete payment securely.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShoppingCheckout;
