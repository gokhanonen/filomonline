import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type { Product, ProductFormValues, ProductType } from "@/@types/product";

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ProductType;
  onlyActive?: boolean;
}

export async function listProducts(
  params: ListProductsParams = {},
): Promise<Paginated<Product>> {
  const { data } = await axios.get<Paginated<Product>>("/products", { params });
  return data;
}

export async function createProduct(values: ProductFormValues): Promise<Product> {
  const { data } = await axios.post<Product>("/products", values);
  return data;
}

export async function updateProduct(
  id: string,
  values: Partial<ProductFormValues> & { isActive?: boolean },
): Promise<Product> {
  const { data } = await axios.patch<Product>(`/products/${id}`, values);
  return data;
}

export async function deactivateProduct(id: string): Promise<void> {
  await axios.delete(`/products/${id}`);
}
