import axios from "@/utils/axios";
import type {
  CreateCategoryInput,
  CreateDocumentInput,
  CreateTypeInput,
  DocCategory,
  DocReferenceType,
  DocType,
  DocumentItem,
  UpdateCategoryInput,
  UpdateTypeInput,
} from "@/@types/document";

export async function getDocumentMeta(module?: string): Promise<DocCategory[]> {
  const { data } = await axios.get<DocCategory[]>("/documents/meta", {
    params: module ? { module } : undefined,
  });
  return data;
}

export async function loadDefaultCategories(): Promise<{ created: number; categories: DocCategory[] }> {
  const { data } = await axios.post<{ created: number; categories: DocCategory[] }>(
    "/documents/categories/defaults",
  );
  return data;
}

export async function createDocumentCategory(input: CreateCategoryInput): Promise<DocCategory> {
  const { data } = await axios.post<DocCategory>("/documents/categories", input);
  return data;
}

export async function updateDocumentCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<DocCategory> {
  const { data } = await axios.patch<DocCategory>(`/documents/categories/${id}`, input);
  return data;
}

export async function deleteDocumentCategory(id: string): Promise<void> {
  await axios.delete(`/documents/categories/${id}`);
}

export async function createDocumentType(input: CreateTypeInput): Promise<DocType> {
  const { data } = await axios.post<DocType>("/documents/types", input);
  return data;
}

export async function updateDocumentType(id: string, input: UpdateTypeInput): Promise<DocType> {
  const { data } = await axios.patch<DocType>(`/documents/types/${id}`, input);
  return data;
}

export async function deleteDocumentType(id: string): Promise<void> {
  await axios.delete(`/documents/types/${id}`);
}

export async function listDocuments(
  referenceType: DocReferenceType,
  referenceId: string,
): Promise<DocumentItem[]> {
  const { data } = await axios.get<DocumentItem[]>("/documents", {
    params: { referenceType, referenceId },
  });
  return data;
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentItem> {
  const { data } = await axios.post<DocumentItem>("/documents", input);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await axios.delete(`/documents/${id}`);
}
