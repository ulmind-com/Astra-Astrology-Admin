"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { ProductForm } from "@/components/shop/product-form";
import { Button, LoadingBlock } from "@/components/ui";
import { shopAdminApi } from "@/lib/api";

export default function EditProductPage() {
  const params = useParams();
  const productId = params?.id as string;

  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shop_product", productId],
    queryFn: async () => {
      const res = await shopAdminApi.getProduct(productId);
      return res;
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="py-20">
        <LoadingBlock label="Loading remedy product details..." />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Product Not Found</h2>
        <p className="text-xs text-slate-500">
          The product you are trying to edit does not exist or may have been deleted.
        </p>
        <Link href="/products">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Products Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2">
      <ProductForm initialProduct={product} isEditing={true} />
    </div>
  );
}
