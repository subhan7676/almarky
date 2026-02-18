"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { UploadCloud } from "lucide-react";
import { formatPKR, optimizeImageUrl } from "@/lib/utils";
import type { ProductFormInput } from "@/types/commerce";
import { AdminInputField } from "./admin-input-field";

type ColorKey = "colorName" | "colorHex" | "stock";

type AdminProductFormProps = {
  form: ProductFormInput;
  setForm: Dispatch<SetStateAction<ProductFormInput>>;
  editingId: string | null;
  busy: boolean;
  uploading: boolean;
  message: string | null;
  manualImageUrl: string;
  setManualImageUrl: Dispatch<SetStateAction<string>>;
  uploadProgress: Record<string, number>;
  computedSellingPrice: number;
  handleColorChange: (index: number, key: ColorKey, value: string) => void;
  uploadImages: (files: FileList | null) => Promise<void>;
  addManualUrl: () => void;
  save: () => Promise<void>;
  resetForm: () => void;
};

export function AdminProductForm({
  form,
  setForm,
  editingId,
  busy,
  uploading,
  message,
  manualImageUrl,
  setManualImageUrl,
  uploadProgress,
  computedSellingPrice,
  handleColorChange,
  uploadImages,
  addManualUrl,
  save,
  resetForm,
}: AdminProductFormProps) {
  return (
    <section className="anim-surface rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-black text-slate-900">
          {editingId ? "Edit Product" : "Add Product"}
        </h2>
        {editingId ? (
          <button
            type="button"
            onClick={resetForm}
            className="anim-interactive rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel Edit
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminInputField
          label="Product Name"
          value={form.name}
          onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
        />
        <AdminInputField
          label="Category"
          value={form.category}
          onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
        />
        <AdminInputField
          label="Type"
          value={form.type}
          onChange={(value) => setForm((prev) => ({ ...prev, type: value }))}
        />
        <AdminInputField
          label="Delivery Fee (PKR)"
          value={String(form.deliveryFee)}
          type="number"
          onChange={(value) =>
            setForm((prev) => ({ ...prev, deliveryFee: Number(value) || 0 }))
          }
        />
        <div className="sm:col-span-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="anim-input h-24 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring focus:ring-orange-100"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 sm:p-4">
        <h3 className="text-sm font-bold text-slate-900">Pricing</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Mode</span>
            <select
              value={form.priceMode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  priceMode: event.target.value as "auto" | "manual",
                }))
              }
              className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <AdminInputField
            label="Original Price"
            value={String(form.originalPrice)}
            type="number"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, originalPrice: Number(value) || 0 }))
            }
          />
          <AdminInputField
            label="Discount %"
            value={String(form.discountPercent)}
            type="number"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, discountPercent: Number(value) || 0 }))
            }
          />
        </div>
        <div className="mt-3">
          {form.priceMode === "manual" ? (
            <AdminInputField
              label="Selling Price"
              value={String(form.sellingPrice)}
              type="number"
              onChange={(value) =>
                setForm((prev) => ({ ...prev, sellingPrice: Number(value) || 0 }))
              }
            />
          ) : (
            <p className="text-sm text-slate-600">
              Auto selling price:{" "}
              <strong className="text-slate-900">{formatPKR(computedSellingPrice)}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Color Variants</h3>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                colors: [...prev.colors, { colorName: "", colorHex: "#111827", stock: 0 }],
              }))
            }
            className="anim-interactive rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Add Color
          </button>
        </div>
        <div className="space-y-2">
          {form.colors.map((color, index) => (
            <div key={`${color.colorName}_${index}`} className="grid gap-2 sm:grid-cols-4">
              <AdminInputField
                label="Name"
                value={color.colorName}
                onChange={(value) => handleColorChange(index, "colorName", value)}
              />
              <AdminInputField
                label="Hex"
                value={color.colorHex}
                onChange={(value) => handleColorChange(index, "colorHex", value)}
              />
              <AdminInputField
                label="Stock"
                value={String(color.stock)}
                type="number"
                onChange={(value) => handleColorChange(index, "stock", value)}
              />
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    colors: prev.colors.filter((_, idx) => idx !== index),
                  }))
                }
                disabled={form.colors.length <= 1}
                className="anim-interactive self-end rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 sm:p-4">
        <h3 className="text-sm font-bold text-slate-900">Images</h3>
        <p className="mt-1 text-xs text-slate-500">
          Upload directly from your device. Image URLs are auto-added after upload.
        </p>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void uploadImages(event.dataTransfer.files);
          }}
          className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-xs text-slate-600"
        >
          Drag and drop images here
        </div>
        <label className="anim-interactive mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          <UploadCloud className="size-4" />
          {uploading ? "Uploading in background..." : "Upload from Device"}
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(event) => void uploadImages(event.target.files)}
          />
        </label>

        {Object.keys(uploadProgress).length > 0 ? (
          <div className="mt-3 space-y-2">
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName}>
                <div className="mb-1 flex justify-between text-[11px] text-slate-600">
                  <span className="line-clamp-1">{fileName}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex gap-2">
          <input
            value={manualImageUrl}
            onChange={(event) => setManualImageUrl(event.target.value)}
            placeholder="Paste image URL"
            className="anim-input w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addManualUrl}
            className="anim-interactive rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          >
            Add
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {form.images.map((image) => (
            <div key={image} className="relative overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={
                  optimizeImageUrl(image, {
                    width: 360,
                    height: 280,
                  }) || "/globe.svg"
                }
                alt="Product"
                width={300}
                height={220}
                sizes="(min-width: 640px) 140px, 33vw"
                className="h-20 w-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    images: prev.images.filter((item) => item !== image),
                  }))
                }
                className="anim-interactive absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white"
              >
                X
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="mt-4 inline-flex items-start gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={form.isHotDeal}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, isHotDeal: event.target.checked }))
          }
        />
        <span>
          Hot Deal
          <span className="block text-xs font-normal text-slate-500">
            Sends a Hot Deal notification with product name and link.
          </span>
        </span>
      </label>

      <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={form.isVisible}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, isVisible: event.target.checked }))
          }
        />
        Visible on storefront
      </label>

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || uploading}
        className="anim-interactive mt-4 inline-flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"
      >
        {busy ? "Saving..." : editingId ? "Update Product" : "Create Product"}
      </button>

      {message ? (
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
