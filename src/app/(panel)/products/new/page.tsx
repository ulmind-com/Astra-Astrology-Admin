"use client";

import * as React from "react";
import { ProductForm } from "@/components/shop/product-form";

export default function NewProductPage() {
  return (
    <div className="max-w-6xl mx-auto py-2">
      <ProductForm isEditing={false} />
    </div>
  );
}
