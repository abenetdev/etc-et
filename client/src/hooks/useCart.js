/**
 * useCart — centralised add-to-cart logic
 *
 * Handles:
 * - Auth check (prompts login if not authenticated)
 * - Stock validation (checks existing cart qty vs available stock)
 * - Dispatches addToCart, then refreshes cart
 * - Shows toast on success/failure
 */

import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { useToast } from "@/components/ui/use-toast";

export function useCart() {
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const { toast }      = useToast();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { cartItems }  = useSelector((s) => s.shopCart);

  /**
   * @param {string} productId
   * @param {number} totalStock  — available stock from the product
   * @param {number} [qty=1]     — how many to add (default 1)
   */
  async function handleAddToCart(productId, totalStock, qty = 1) {
    // 1. Auth check
    if (!isAuthenticated || !user) {
      toast({
        title:       "Please log in",
        description: "You need to be logged in to add items to your cart",
        variant:     "destructive",
      });
      navigate("/auth/login");
      return false;
    }

    // 2. Stock check against what's already in cart
    const existingItem = (cartItems?.items || []).find(
      (item) => item.productId === productId
    );
    const alreadyInCart = existingItem?.quantity || 0;

    if (alreadyInCart + qty > totalStock) {
      toast({
        title:       "Stock limit reached",
        description: totalStock === 0
          ? "This product is out of stock"
          : `Only ${totalStock - alreadyInCart} more unit${totalStock - alreadyInCart !== 1 ? "s" : ""} can be added`,
        variant:     "destructive",
      });
      return false;
    }

    // 3. Dispatch
    const result = await dispatch(
      addToCart({ userId: user.id, productId, quantity: qty })
    );

    if (result?.payload?.success) {
      // Refresh the full cart so counts are accurate everywhere
      dispatch(fetchCartItems(user.id));
      toast({ title: "Added to cart!" });
      return true;
    } else {
      toast({
        title:       "Could not add to cart",
        description: result?.payload?.message || "Please try again",
        variant:     "destructive",
      });
      return false;
    }
  }

  return { handleAddToCart };
}
