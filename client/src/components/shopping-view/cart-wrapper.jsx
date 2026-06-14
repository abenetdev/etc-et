import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Separator } from "../ui/separator";
import UserCartItemsContent from "./cart-items-content";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { currencyFormatter } from "@/utils";

function UserCartWrapper({ cartItems, setOpenCartSheet }) {
  const navigate = useNavigate();

  const totalCartAmount =
    cartItems?.length > 0
      ? cartItems.reduce((sum, item) => {
          const price = item?.salePrice > 0 ? item.salePrice : item?.price;
          return sum + price * item?.quantity;
        }, 0)
      : 0;

  const itemCount = cartItems?.reduce((sum, item) => sum + (item?.quantity || 0), 0) ?? 0;

  return (
    <SheetContent className="sm:max-w-md flex flex-col">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Your Cart
          {itemCount > 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
          )}
        </SheetTitle>
      </SheetHeader>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto mt-4">
        {cartItems && cartItems.length > 0 ? (
          <div className="space-y-1">
            {cartItems.map((item) => (
              <UserCartItemsContent key={item.productId} cartItem={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Your cart is empty</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate("/shop/listing");
                setOpenCartSheet(false);
              }}
            >
              Browse Products
            </Button>
          </div>
        )}
      </div>

      {/* Summary + checkout */}
      {cartItems?.length > 0 && (
        <div className="border-t pt-4 space-y-3 mt-auto">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-bold">ETB {currencyFormatter(totalCartAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-green-600">Free</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>ETB {currencyFormatter(totalCartAmount)}</span>
          </div>
          <Button
            className="w-full"
            onClick={() => {
              navigate("/shop/checkout");
              setOpenCartSheet(false);
            }}
          >
            Proceed to Checkout
          </Button>
        </div>
      )}
    </SheetContent>
  );
}

export default UserCartWrapper;
