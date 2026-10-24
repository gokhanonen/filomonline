export interface DocType {
  id: string;
  value: string;
  label: string;
  categoryId: string;
  sortOrder?: number;
}

export interface DocCategory {
  id: string;
  value: string;
  label: string;
  module?: string;
  sortOrder?: number;
  types: DocType[];
}

export interface CreateCategoryInput {
  value: string;
  label: string;
  module?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  label?: string;
  module?: string;
  sortOrder?: number;
}

export interface CreateTypeInput {
  categoryId: string;
  value: string;
  label: string;
  sortOrder?: number;
}

export interface UpdateTypeInput {
  label?: string;
  sortOrder?: number;
}

export type DocReferenceType = "VEHICLE" | "CUSTOMER" | "CONTRACT" | "INVOICE";

export interface DocumentItem {
  id: string;
  categoryId: string;
  typeId: string;
  fileName: string;
  fileKey: string;
  thumbKey?: string | null;
  fileType: string;
  fileSize: number;
  description?: string | null;
  expiryDate?: string | null;
  url: string;
  thumbUrl?: string | null;
  createdAt: string;
}

export interface CreateDocumentInput {
  categoryId: string;
  typeId: string;
  referenceType: DocReferenceType;
  referenceId: string;
  fileName: string;
  fileKey: string;
  thumbKey?: string;
  fileType: string;
  fileSize: number;
  expiryDate?: string;
}
