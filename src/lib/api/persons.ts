import { apiClient } from "@/lib/api/client";
import type {
  DeleteResponse,
  Embedding,
  EnrollmentResponse,
  Person,
} from "@/types";

/** GET /api/persons */
export function getPersons(): Promise<Person[]> {
  return apiClient.get<Person[]>("/api/persons");
}

export interface EnrollPersonInput {
  personCode: string;
  name: string;
  /** Files already renamed to front.jpg / left_45.jpg / right_45.jpg. */
  files: File[];
}

/** POST /api/persons (multipart/form-data) */
export function enrollPerson({
  personCode,
  name,
  files,
}: EnrollPersonInput): Promise<EnrollmentResponse> {
  const formData = new FormData();
  formData.append("person_code", personCode);
  formData.append("name", name);
  for (const file of files) {
    formData.append("files", file, file.name);
  }
  return apiClient.post<EnrollmentResponse>("/api/persons", formData);
}

/** GET /api/persons/{person_id}/embeddings */
export function getPersonEmbeddings(personId: number): Promise<Embedding[]> {
  return apiClient.get<Embedding[]>(`/api/persons/${personId}/embeddings`);
}

/** DELETE /api/persons/{person_id} */
export function deletePerson(personId: number): Promise<DeleteResponse> {
  return apiClient.delete<DeleteResponse>(`/api/persons/${personId}`);
}

/** DELETE /api/embeddings/{embedding_id} */
export function deleteEmbedding(embeddingId: number): Promise<DeleteResponse> {
  return apiClient.delete<DeleteResponse>(`/api/embeddings/${embeddingId}`);
}
