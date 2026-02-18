"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadImagesToCloudinary } from "@/lib/cloudinary";
import {
  getReadableFirestoreError,
  deleteProduct,
  saveProduct,
  subscribeAdminProducts,
  toggleProductVisibility,
} from "@/lib/firebase/firestore";
import { validateColors } from "@/lib/validation";
import { computeSellingPrice } from "@/lib/utils";
import type { Product, ProductFormInput } from "@/types/commerce";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingState } from "@/components/ui/loading-state";
import { defaultProductTemplate } from "../constants";
import { AdminProductForm } from "./admin-product-form";
import { AdminProductsList } from "./admin-products-list";

export function AdminProductsManager() {
  const { user, configured } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductFormInput>(defaultProductTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");

  useEffect(() => {
    if (!configured) return;

    const unsubscribe = subscribeAdminProducts(
      (items) => {
        setProducts(items);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setMessage(getReadableFirestoreError(error));
      },
      300,
    );

    return () => unsubscribe();
  }, [configured]);

  const computedSellingPrice = useMemo(() => {
    return form.priceMode === "auto"
      ? computeSellingPrice(form.originalPrice, form.discountPercent)
      : form.sellingPrice;
  }, [form]);

  const resetForm = () => {
    setForm(defaultProductTemplate);
    setEditingId(null);
    setUploadProgress({});
  };

  const handleColorChange = (
    index: number,
    key: "colorName" | "colorHex" | "stock",
    value: string,
  ) => {
    setForm((prev) => {
      const next = [...prev.colors];
      next[index] = {
        ...next[index],
        [key]: key === "stock" ? Math.max(0, Number(value) || 0) : value,
      };
      return { ...prev, colors: next };
    });
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const list = Array.from(files);
    setUploading(true);
    setMessage(null);
    setUploadProgress(
      Object.fromEntries(list.map((file) => [file.name, 0])) as Record<string, number>,
    );

    try {
      const uploaded = await uploadImagesToCloudinary(list, {
        onProgress: ({ fileName, progress }) =>
          setUploadProgress((prev) => ({ ...prev, [fileName]: progress })),
      });
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
      setMessage(
        `${uploaded.length} image(s) uploaded and linked automatically.`,
      );
      window.setTimeout(() => setUploadProgress({}), 1400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const addManualUrl = () => {
    if (!manualImageUrl.trim()) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, manualImageUrl.trim()] }));
    setManualImageUrl("");
  };

  const save = async () => {
    if (!configured) {
      setMessage("Service setup is required.");
      return;
    }
    if (!user?.email) {
      setMessage("Admin user session not found. Login again.");
      return;
    }
    if (!form.name.trim() || !form.description.trim()) {
      setMessage("Name and description are required.");
      return;
    }
    if (!form.images.length) {
      setMessage("Upload at least one image.");
      return;
    }
    const colorsError = validateColors(form.colors);
    if (colorsError) {
      setMessage(colorsError);
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const payload: ProductFormInput = {
        ...form,
        sellingPrice:
          form.priceMode === "auto"
            ? computeSellingPrice(form.originalPrice, form.discountPercent)
            : form.sellingPrice,
      };
      await saveProduct(payload, user.email, editingId ?? undefined);
      setMessage(editingId ? "Product updated." : "Product created.");
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save product.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      type: product.type,
      images: product.images,
      isVisible: product.isVisible,
      isHotDeal: Boolean(product.isHotDeal),
      priceMode: product.priceMode,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent,
      sellingPrice: product.sellingPrice,
      deliveryFee: product.deliveryFee,
      colors: product.colors,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleVisibility = async (productId: string, nextVisible: boolean) => {
    if (busyProductId) return;
    setBusyProductId(productId);
    setMessage(null);
    try {
      await toggleProductVisibility(productId, nextVisible);
      setMessage(
        nextVisible
          ? "Product is now visible on storefront."
          : "Product hidden from storefront.",
      );
    } catch (error) {
      setMessage(getReadableFirestoreError(error));
    } finally {
      setBusyProductId(null);
    }
  };

  const handleDelete = async (productId: string) => {
    if (busyProductId) return;
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            "Delete this product permanently from database and images?",
          )
        : false;
    if (!confirmed) return;
    setBusyProductId(productId);
    setMessage(null);
    try {
      const result = await deleteProduct(productId);
      const deletedImages = result?.deletedImages ?? 0;
      const skippedImages = result?.skippedImages ?? 0;
      const imageNote = `Images: ${deletedImages} deleted${skippedImages ? `, ${skippedImages} skipped` : ""}.`;
      setMessage(`Product deleted permanently. ${imageNote}`);
    } catch (error) {
      setMessage(getReadableFirestoreError(error));
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <section className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Products</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create, edit, hide, and stock-control products with direct image uploads.
        </p>
      </div>

      {loading ? <LoadingState label="Loading products..." /> : null}

      <div className="anim-grid-stagger grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AdminProductForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          busy={busy}
          uploading={uploading}
          message={message}
          manualImageUrl={manualImageUrl}
          setManualImageUrl={setManualImageUrl}
          uploadProgress={uploadProgress}
          computedSellingPrice={computedSellingPrice}
          handleColorChange={handleColorChange}
          uploadImages={uploadImages}
          addManualUrl={addManualUrl}
          save={save}
          resetForm={resetForm}
        />

        <AdminProductsList
          products={products}
          onEdit={startEdit}
          onToggleVisibility={handleToggleVisibility}
          onDelete={handleDelete}
          busyProductId={busyProductId}
        />
      </div>
    </section>
  );
}
