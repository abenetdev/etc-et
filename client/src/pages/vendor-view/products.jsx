import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/components/ui/use-toast";
import {
  MoreVertical,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Package,
} from "lucide-react";
import ProductImageUpload from "@/components/vendor-view/image-upload";
import CommonForm from "@/components/common/form";
import { addProductFormElements } from "@/config";
import {
  addNewProduct,
  deleteProduct,
  editProduct,
  fetchAllProducts,
} from "@/store/vendor/products-slice";

const initialFormData = {
  name: "",
  description: "",
  category: "",
  brand: "",
  price: "",
  salePrice: "",
  stock: "",
  status: "active",
  images: [],
};

function VendorProducts() {
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [imageLoadingState, setImageLoadingState] = useState(false);
  const [currentEditedId, setCurrentEditedId] = useState(null);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const { productList, isListLoading } = useSelector((state) => state.vendorProducts);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      dispatch(fetchAllProducts({}));
    }
  }, [dispatch, isAuthenticated, user?.id]);

  const handleOpenDialog = () => {
    setFormData(initialFormData);
    setUploadedImageUrls([]);
    setImageFiles([]);
    setCurrentEditedId(null);
    setOpenDialog(true);
  };

  const handleEditProduct = (product) => {
    setFormData({
      name: product.name || product.title || "",
      description: product.description || "",
      category: product.category || "",
      brand: product.brand || "",
      price: product.price || "",
      salePrice: product.salePrice || "",
      stock: product.stock || "",
      status: product.status || "active",
    });
    setUploadedImageUrls(product.images || []);
    setCurrentEditedId(product._id);
    setOpenDialog(true);
  };

  const handleDeleteClick = (productId) => {
    setDeleteProductId(productId);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    dispatch(deleteProduct(deleteProductId)).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchAllProducts({}));
        toast({
          title: "Product deleted successfully",
        });
      }
    });
    setOpenDeleteDialog(false);
    setDeleteProductId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const productData = {
      ...formData,
      images: uploadedImageUrls,
    };

    if (currentEditedId) {
      dispatch(editProduct({ id: currentEditedId, formData: productData })).then(
        (data) => {
          console.log("Edit response:", data);
          if (data?.payload?.success) {
            dispatch(fetchAllProducts({}));
            setOpenDialog(false);
            setFormData(initialFormData);
            setUploadedImageUrls([]);
            toast({
              title: "Product updated successfully",
            });
          }
        }
      );
    } else {
      dispatch(addNewProduct(productData)).then((data) => {
        console.log("Add product response:", data);
        if (data?.payload?.success) {
          dispatch(fetchAllProducts({}));
          setOpenDialog(false);
          setFormData(initialFormData);
          setUploadedImageUrls([]);
          toast({
            title: "Product added successfully",
          });
        } else {
          toast({
            title: "Error adding product",
            description: data?.payload?.message || "Something went wrong",
            variant: "destructive",
          });
        }
      });
    }
  };

  const isFormValid = () => {
    console.log("Validating form:", formData);
    const isValid =
      formData.name &&
      formData.description &&
      formData.category &&
      formData.price &&
      formData.stock !== "" &&
      uploadedImageUrls.length > 0;
    
    console.log("Form valid:", isValid);
    return isValid;
  };

  // Filter products
  const filteredProducts = productList?.filter((product) => {
    const displayName = product.name || product.title || "";
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || product.status === filterStatus;

    const matchesCategory =
      filterCategory === "all" || product.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <Fragment>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">
              Manage your product inventory
            </p>
          </div>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="men">Men</SelectItem>
              <SelectItem value="women">Women</SelectItem>
              <SelectItem value="kids">Kids</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
              <SelectItem value="footwear">Footwear</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="home">Home & Living</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isListLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div className="h-12 w-12 rounded overflow-hidden bg-muted">
                      {(product.images?.[0] || product.image) ? (
                        <img
                          src={product.images?.[0] || product.image}
                          alt={product.name || product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name || product.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.brand || "No brand"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{product.category}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">ETB {product.price}</div>
                      {product.salePrice > 0 && (
                        <div className="text-sm text-green-600">
                          Sale: ETB {product.salePrice}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        product.stock === 0
                          ? "text-red-600 font-medium"
                          : product.stock < 10
                          ? "text-orange-600 font-medium"
                          : ""
                      }
                    >
                      {product.stock} units
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "active" ? "default" : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditProduct(product)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(product._id)}
                          className="gap-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No products found</p>
                    <Button onClick={handleOpenDialog} variant="outline">
                      Add Your First Product
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentEditedId ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          {/* Image Upload */}
          <div className="mb-6">
            <ProductImageUpload
              imageFile={imageFiles[0]}
              setImageFile={(file) => setImageFiles([file])}
              uploadedImageUrl={uploadedImageUrls[0] || ""}
              setUploadedImageUrl={(url) => setUploadedImageUrls([url])}
              setImageLoadingState={setImageLoadingState}
              imageLoadingState={imageLoadingState}
              isEditMode={false}
            />
          </div>

          {/* Form Fields */}
          <CommonForm
            formData={formData}
            setFormData={setFormData}
            buttonText={currentEditedId ? "Update Product" : "Add Product"}
            formControls={addProductFormElements}
            isBtnDisabled={!isFormValid()}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this product?</p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setOpenDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

export default VendorProducts;
