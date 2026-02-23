"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLocalCart } from "@/components/providers/local-cart-provider";
import { useLocalProfile } from "@/components/providers/local-profile-provider";
import { RectToast } from "@/components/ui/rect-toast";
import { PAKISTAN_PROVINCES } from "@/lib/constants";
import { placeOrderFromCart } from "@/lib/firebase/firestore";
import { prependLocalOrder } from "@/lib/local-storage";
import { validateCustomerDetails } from "@/lib/validation";
import { formatPKR } from "@/lib/utils";
import type { CustomerDetails } from "@/types/commerce";

const defaultDetails: CustomerDetails = {
  fullName: "",
  phonePk: "",
  province: "",
  city: "",
  tehsil: "",
  district: "",
  houseAddress: "",
  shopName: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { configured, configError, user } = useAuth();
  const {
    hydrated,
    selectedItems,
    subtotal,
    deliveryTotal,
    grandTotal,
    clearSelectedItems,
  } = useLocalCart();
  const { profile, updateProfile } = useLocalProfile();

  const [customerDetails, setCustomerDetails] =
    useState<CustomerDetails>(defaultDetails);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDetails, string>>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlacedToastOpen, setOrderPlacedToastOpen] = useState(false);
  

  useEffect(() => {
    if (!hydrated) return;
    setCustomerDetails({
      fullName: profile.fullName || profile.displayName || "",
      phonePk: profile.phonePk || "",
      province: profile.province || "",
      city: profile.city || "",
      tehsil: profile.tehsil || "",
      district: profile.district || "",
      houseAddress: profile.houseAddress || "",
      shopName: profile.shopName || "",
    });
  }, [hydrated, profile]);

  const updateField = (key: keyof CustomerDetails, value: string) => {
    setCustomerDetails((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submitOrder = () => {
    const nextErrors = validateCustomerDetails(customerDetails);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!selectedItems.length) {
      setMessage("Select at least one item from cart before checkout.");
      return;
    }
    void placeFinalOrder();
  };

  const placeFinalOrder = async () => {
    if (!configured) {
      setMessage(configError ?? "Service setup is required.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const result = await placeOrderFromCart(
        selectedItems.map((item) => ({
          productId: item.productId,
          colorName: item.colorName,
          quantity: item.quantity,
          productName: item.productSnapshot.name,
          productSlug: item.productSnapshot.slug,
          productImage: item.productSnapshot.image,
          unitPrice: item.unitPrice,
          deliveryFee: item.deliveryFee,
          productSnapshot: item.productSnapshot,
        })),
        customerDetails,
      );

      updateProfile({
        fullName: customerDetails.fullName,
        phonePk: customerDetails.phonePk,
        province: customerDetails.province,
        city: customerDetails.city,
        tehsil: customerDetails.tehsil,
        district: customerDetails.district,
        houseAddress: customerDetails.houseAddress,
        shopName: customerDetails.shopName,
      });
      clearSelectedItems();
      const placedOrderId = result.orderId ?? `local-${Date.now()}`;
      const placedOrderNumber = result.orderNumber ?? placedOrderId ?? `ALM-${Date.now()}`;

      prependLocalOrder({
        id: placedOrderId,
        uid: user?.uid ?? "local-user",
        orderNumber: placedOrderNumber,
        items: selectedItems.map((item) => ({
          productId: item.productId,
          name: item.productSnapshot.name,
          slug: item.productSnapshot.slug,
          image: item.productSnapshot.image,
          color: item.colorName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          deliveryFee: item.deliveryFee,
          lineTotal: item.unitPrice * item.quantity,
        })),
        pricing: {
          subtotal,
          deliveryTotal,
          grandTotal,
        },
        customerDetails: {
          fullName: customerDetails.fullName,
          phonePk: customerDetails.phonePk,
          province: customerDetails.province,
          city: customerDetails.city,
          tehsil: customerDetails.tehsil,
          district: customerDetails.district,
          houseAddress: customerDetails.houseAddress,
          shopName: customerDetails.shopName,
        },
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setMessage(null);
      setOrderPlacedToastOpen(true);
      const warningQuery = result.warning
        ? `?warning=${encodeURIComponent(result.warning)}`
        : "";
      router.push(`/order-confirmation/${placedOrderId}${warningQuery}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to place order. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <section className="space-y-6">
        <RectToast
          open={orderPlacedToastOpen}
          message="Order successfully placed."
          tone="success"
        />
        <div className="anim-page-enter">
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Checkout</h1>
          <p className="mt-2 text-sm text-slate-600">
            COD only. Review delivery details and confirm your order.
          </p>
        </div>

        {!hydrated ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-600 ring-1 ring-slate-200">
            Loading checkout...
          </div>
        ) : null}

        {hydrated && selectedItems.length === 0 ? (
          <div className="anim-surface rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
            <p className="text-lg font-semibold text-slate-900">
              No selected items found
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Go to cart and select one or more items to place order.
            </p>
            <Link
              href="/cart"
              className="anim-interactive mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Return to Cart
            </Link>
          </div>
        ) : null}

        {hydrated && selectedItems.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px]">
            <div className="anim-surface rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Delivery Details</h2>
              <div className="anim-grid-stagger mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name *"
                  value={customerDetails.fullName}
                  onChange={(value) => updateField("fullName", value)}
                  error={errors.fullName}
                />
                <Input
                  label="Pakistani Phone *"
                  value={customerDetails.phonePk}
                  onChange={(value) => updateField("phonePk", value)}
                  error={errors.phonePk}
                  placeholder="+923001234567 or 03001234567"
                />
                <SelectField
                  label="Province *"
                  value={customerDetails.province}
                  onChange={(value) => updateField("province", value)}
                  error={errors.province}
                  options={PAKISTAN_PROVINCES}
                  placeholder="Select province"
                />
                <Input
                  label="City *"
                  value={customerDetails.city}
                  onChange={(value) => updateField("city", value)}
                  error={errors.city}
                />
                <Input
                  label="Tehsil *"
                  value={customerDetails.tehsil}
                  onChange={(value) => updateField("tehsil", value)}
                  error={errors.tehsil}
                />
                <Input
                  label="District *"
                  value={customerDetails.district}
                  onChange={(value) => updateField("district", value)}
                  error={errors.district}
                />
                <Input
                  label="Shop Name (Optional)"
                  value={customerDetails.shopName ?? ""}
                  onChange={(value) => updateField("shopName", value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="House Address *"
                    value={customerDetails.houseAddress}
                    onChange={(value) => updateField("houseAddress", value)}
                    error={errors.houseAddress}
                  />
                </div>
              </div>
            </div>

            <aside className="anim-surface h-fit rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Selected Items</h2>
              <div className="anim-list-stagger mt-3 space-y-3">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <p className="font-semibold text-slate-900">
                      {item.productSnapshot.name}
                    </p>
                    <p className="text-xs">Color: {item.colorName}</p>
                    <p className="text-xs">
                      {item.quantity} x {formatPKR(item.unitPrice)}
                    </p>
                    <p className="text-xs">Delivery: {formatPKR(item.deliveryFee)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>{formatPKR(subtotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <strong>{formatPKR(deliveryTotal)}</strong>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between text-base text-slate-900">
                  <span className="font-semibold">Grand total</span>
                  <strong>{formatPKR(grandTotal)}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting}
                className="anim-interactive mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700"
              >
                {submitting ? "Placing..." : "Place COD Order"}
              </button>
            </aside>
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {message}
          </div>
        ) : null}

      </section>
  );
}

function Input({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`anim-input w-full rounded-xl border px-3 py-2 outline-none focus:ring ${
          error
            ? "border-rose-300 ring-rose-100"
            : "border-slate-200 ring-orange-100 focus:border-orange-300"
        }`}
      />
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  error?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`anim-input w-full rounded-xl border bg-white px-3 py-2 outline-none focus:ring ${
          error
            ? "border-rose-300 ring-rose-100"
            : "border-slate-200 ring-orange-100 focus:border-orange-300"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
