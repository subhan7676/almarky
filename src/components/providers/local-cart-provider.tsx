"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { readLocalCart, writeLocalCart } from "@/lib/local-storage";
import { slugify } from "@/lib/utils";
import type { LocalCartItem, Product } from "@/types/commerce";

type LocalCartContextValue = {
  hydrated: boolean;
  items: LocalCartItem[];
  selectedItems: LocalCartItem[];
  cartCount: number;
  subtotal: number;
  deliveryTotal: number;
  grandTotal: number;
  addProductToCart: (product: Product, colorName: string, quantity: number) => void;
  toggleItemSelection: (itemId: string, selected: boolean) => void;
  setAllSelection: (selected: boolean) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearSelectedItems: () => void;
  clearCart: () => void;
};

const LocalCartContext = createContext<LocalCartContextValue | undefined>(undefined);

export function LocalCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LocalCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const initial = readLocalCart();
    queueMicrotask(() => {
      setItems(initial);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      writeLocalCart(items);
    }, 120);
    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, [items, hydrated]);

  const addProductToCart = (product: Product, colorName: string, quantity: number) => {
    const safeQuantity = Math.max(1, quantity);
    const itemId = `${product.id}_${slugify(colorName)}`;
    setItems((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity + safeQuantity,
                selectedForCheckout: true,
                updatedAt: Date.now(),
              }
            : item,
        );
      }

      return [
        {
          id: itemId,
          productId: product.id,
          productSnapshot: {
            name: product.name,
            slug: product.slug,
            image: product.images[0] ?? "",
            type: product.type,
            sellingPrice: product.sellingPrice,
            originalPrice: product.originalPrice,
          },
          colorName,
          quantity: safeQuantity,
          selectedForCheckout: true,
          unitPrice: product.sellingPrice,
          deliveryFee: product.deliveryFee,
          updatedAt: Date.now(),
        },
        ...prev,
      ];
    });
  };

  const toggleItemSelection = (itemId: string, selected: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, selectedForCheckout: selected, updatedAt: Date.now() }
          : item,
      ),
    );
  };

  const setAllSelection = (selected: boolean) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        selectedForCheckout: selected,
        updatedAt: Date.now(),
      })),
    );
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const safeQuantity = Math.max(1, quantity);
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: safeQuantity, updatedAt: Date.now() }
          : item,
      ),
    );
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearSelectedItems = () => {
    setItems((prev) => prev.filter((item) => !item.selectedForCheckout));
  };

  const clearCart = () => {
    setItems([]);
  };

  const selectedItems = useMemo(
    () => items.filter((item) => item.selectedForCheckout),
    [items],
  );

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [selectedItems],
  );

  const deliveryTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.deliveryFee, 0),
    [selectedItems],
  );

  const grandTotal = subtotal + deliveryTotal;

  const value = useMemo<LocalCartContextValue>(
    () => ({
      hydrated,
      items,
      selectedItems,
      cartCount,
      subtotal,
      deliveryTotal,
      grandTotal,
      addProductToCart,
      toggleItemSelection,
      setAllSelection,
      updateItemQuantity,
      removeItem,
      clearSelectedItems,
      clearCart,
    }),
    [items, selectedItems, cartCount, subtotal, deliveryTotal, grandTotal, hydrated],
  );

  return (
    <LocalCartContext.Provider value={value}>{children}</LocalCartContext.Provider>
  );
}

export function useLocalCart() {
  const context = useContext(LocalCartContext);
  if (!context) {
    throw new Error("useLocalCart must be used within LocalCartProvider.");
  }
  return context;
}
