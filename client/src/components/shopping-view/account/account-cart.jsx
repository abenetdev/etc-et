import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, ShoppingCart, Loader2 } from "lucide-react";
import { fetchCartItems } from "@/store/shop/cart-slice";
import UserCartItemsContent from "../cart-items-content";
import { currencyFormatter } from "@/utils";

function AccountCart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { cartItems, isLoading } = useSelector((state) => state.shopCart);

  const userId = user?.id || user?._id;
  const items = cartItems?.items || [];

  useEffect(() => {
    if (userId) dispatch(fetchCartItems(userId));
  }, [dispatch, userId]);

  const totalAmount =
    items.length > 0
      ? items.reduce((sum, item) => {
          const price = item?.salePrice > 0 ? item.salePrice : item?.price;
          return sum + price * (item?.quantity || 0);
        }, 0)
      : 0;

  const itemCount = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Cart</h1>
        <p className="text-muted-foreground mt-1">
          {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart Items
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((item) => (
                <UserCartItemsContent key={item.productId} cartItem={item} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md h-fit sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>ETB {currencyFormatter(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>ETB {currencyFormatter(totalAmount)}</span>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate("/shop/checkout")}>
                Proceed to Checkout
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/shop/listing">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Add some products to get started
            </p>
            <Button asChild>
              <Link to="/shop/listing">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AccountCart;
