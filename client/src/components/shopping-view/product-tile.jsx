import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { brandOptionsMap, categoryOptionsMap } from "@/config";
import { ShoppingCart, Loader2, Heart } from "lucide-react";
import { addToWishlist, removeFromWishlist } from "@/store/shop/wishlist-slice";
import { useToast } from "../ui/use-toast";
import { currencyFormatter } from "@/utils";

function ShoppingProductTile({ product, handleAddtoCart }) {
  const [adding, setAdding] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { items: wishlistItems } = useSelector((state) => state.shopWishlist);

  const userId = user?.id || user?._id;
  const isWishlisted = wishlistItems?.some(
    (i) => i.productId?.toString() === product?._id?.toString()
  );

  // Support both new (name/images/stock) and legacy (title/image/totalStock) fields
  const title      = product?.name       || product?.title      || "Unknown Product";
  const image      = product?.images?.[0] || product?.image     || "";
  const totalStock = product?.stock      ?? product?.totalStock ?? 0;
  const price      = product?.price      ?? 0;
  const salePrice  = product?.salePrice  ?? 0;

  const categoryLabel = categoryOptionsMap[product?.category] || product?.category || "";
  const brandLabel    = brandOptionsMap[product?.brand]       || product?.brand    || "";

  async function onAddToCart(e) {
    e.stopPropagation();
    if (adding || totalStock === 0) return;
    setAdding(true);
    await handleAddtoCart(product?._id, totalStock);
    setAdding(false);
  }

  async function onToggleWishlist(e) {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
    const productId = product?._id;
    const result = isWishlisted
      ? await dispatch(removeFromWishlist({ userId, productId }))
      : await dispatch(addToWishlist({ userId, productId }));

    if (result?.payload?.success) {
      toast({
        title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      });
    } else if (result?.payload?.message) {
      toast({ title: result.payload.message, variant: "destructive" });
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto group hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      {/* Image + badges — clicks open product details */}
      <div onClick={() => navigate(`/shop/product/${product?._id}`)}>
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={image}
            alt={title}
            className="w-full h-[280px] object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Stock / sale badge */}
          {totalStock === 0 ? (
            <Badge className="absolute top-2 left-2 bg-red-500">Out of Stock</Badge>
          ) : totalStock < 10 ? (
            <Badge className="absolute top-2 left-2 bg-orange-500">
              Only {totalStock} left
            </Badge>
          ) : salePrice > 0 ? (
            <Badge className="absolute top-2 left-2 bg-green-600">Sale</Badge>
          ) : null}

          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-9 w-9 rounded-full shadow-md"
            onClick={onToggleWishlist}
          >
            <Heart
              className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`}
            />
          </Button>
        </div>

        <CardContent className="p-4">
          <h2 className="text-base font-bold mb-1 line-clamp-2 leading-tight">{title}</h2>

          <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
            <span>{categoryLabel}</span>
            {brandLabel && <span>{brandLabel}</span>}
          </div>

          {/* Price row */}
          <div className="flex items-center gap-2">
            {salePrice > 0 ? (
              <>
                <span className="text-lg font-bold text-primary">
                  ETB {currencyFormatter(salePrice)}
                </span>
                <span className="text-sm line-through text-muted-foreground">
                  ETB {currencyFormatter(price)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary">
                ETB {currencyFormatter(price)}
              </span>
            )}
          </div>
        </CardContent>
      </div>

      {/* Add to cart button */}
      <CardFooter className="p-4 pt-0">
        {totalStock === 0 ? (
          <Button className="w-full" disabled variant="secondary">
            Out of Stock
          </Button>
        ) : (
          <Button
            className="w-full gap-2 bg-[#078178] hover:bg-green-800"
            onClick={onAddToCart}
            disabled={adding}
          >
            {adding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ShoppingProductTile;
