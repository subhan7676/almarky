import { isValidPakistaniPhone } from "@/lib/utils";
import type { CustomerDetails, ProductColor } from "@/types/commerce";

export function validateCustomerDetails(details: CustomerDetails) {
  const errors: Partial<Record<keyof CustomerDetails, string>> = {};

  if (!details.fullName.trim()) errors.fullName = "Full name is required.";
  if (!details.phonePk.trim()) {
    errors.phonePk = "Phone number is required.";
  } else if (!isValidPakistaniPhone(details.phonePk)) {
    errors.phonePk = "Enter a valid Pakistani mobile number.";
  }
  if (!details.province.trim()) errors.province = "Province is required.";
  if (!details.city.trim()) errors.city = "City is required.";
  if (!details.tehsil.trim()) errors.tehsil = "Tehsil is required.";
  if (!details.district.trim()) errors.district = "District is required.";
  if (!details.houseAddress.trim())
    errors.houseAddress = "House address is required.";

  return errors;
}

export function validateColors(colors: ProductColor[]) {
  if (!colors.length) return "At least one color is required.";

  for (const color of colors) {
    if (!color.colorName.trim()) return "Each color needs a name.";
    if (!color.colorHex.trim()) return "Each color needs a hex code.";
    if (color.stock < 0) return "Color stock cannot be negative.";
  }

  return null;
}
