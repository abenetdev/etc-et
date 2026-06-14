import ProductFilter from "@/components/shopping-view/filter";
import ShoppingProductTile from "@/components/shopping-view/product-tile";
import Pagination from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sortOptions } from "@/config";
import {
  fetchAllFilteredProducts,
  fetchProductDetails,
} from "@/store/shop/products-slice";
import { ArrowUpDownIcon, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useCart } from "@/hooks/useCart";

const PAGE_SIZE = 12; // products per page

function createSearchParamsHelper(filterParams) {
  const queryParams = [];
  for (const [key, value] of Object.entries(filterParams)) {
    if (Array.isArray(value) && value.length > 0) {
      queryParams.push(`${key}=${encodeURIComponent(value.join(","))}`);
    }
  }
  return queryParams.join("&");
}

function ShoppingListing() {
  const dispatch = useDispatch();
  const { productList, productDetails } = useSelector((s) => s.shopProducts);
  const [filters, setFilters]           = useState({});
  const [sort, setSort]                 = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage]   = useState(1);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const { handleAddToCart } = useCart();

  const categorySearchParam = searchParams.get("category");

  // ── Reset page when filters/sort change ──────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  // ── Open details dialog ───────────────────────────────────────────────────
  useEffect(() => {
    if (productDetails !== null) setOpenDetailsDialog(true);
  }, [productDetails]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleFilter(sectionId, option) {
    const cpyFilters = { ...filters };
    if (!cpyFilters[sectionId]) {
      cpyFilters[sectionId] = [option];
    } else {
      const idx = cpyFilters[sectionId].indexOf(option);
      if (idx === -1) cpyFilters[sectionId].push(option);
      else cpyFilters[sectionId].splice(idx, 1);
    }
    setFilters(cpyFilters);
    sessionStorage.setItem("filters", JSON.stringify(cpyFilters));
  }

  function handleGetProductDetails(productId) {
    dispatch(fetchProductDetails(productId));
  }

  async function handleAddtoCart(productId, totalStock) {
    await handleAddToCart(productId, totalStock);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setSort("price-lowtohigh");
    setFilters(JSON.parse(sessionStorage.getItem("filters")) || {});
  }, [categorySearchParam]);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      setSearchParams(new URLSearchParams(createSearchParamsHelper(filters)));
    }
  }, [filters]);

  useEffect(() => {
    if (filters !== null && sort !== null) {
      dispatch(fetchAllFilteredProducts({ filterParams: filters, sortParams: sort }));
    }
  }, [dispatch, sort, filters]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalProducts = productList?.length ?? 0;
  const totalPages    = Math.ceil(totalProducts / PAGE_SIZE);
  const startIdx      = (currentPage - 1) * PAGE_SIZE;
  const paginated     = productList?.slice(startIdx, startIdx + PAGE_SIZE) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 p-4 md:p-6">
      <ProductFilter filters={filters} handleFilter={handleFilter} />

      <div className="bg-background w-full rounded-lg shadow-sm border">
        {/* Toolbar */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">All Products</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalProducts} products
              {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <ArrowUpDownIcon className="h-4 w-4" />
                Sort by
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                {sortOptions.map((opt) => (
                  <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Grid */}
        {paginated.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {paginated.map((product) => (
                <ShoppingProductTile
                  key={product._id}
                  product={product}
                  handleGetProductDetails={handleGetProductDetails}
                  handleAddtoCart={handleAddtoCart}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 pb-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-20 gap-3">
            <Package className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">No products match your filters</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({});
                sessionStorage.removeItem("filters");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      
    </div>
  );
}

export default ShoppingListing;
