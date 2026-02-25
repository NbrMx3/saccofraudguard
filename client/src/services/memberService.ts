import api from "@/lib/api";

export interface Member {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt?: string;
  createdBy?: { firstName: string; lastName: string };
}

export interface MemberStats {
  active: number;
  inactive: number;
  suspended: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MembersListResponse {
  members: Member[];
  pagination: PaginationMeta;
}

export async function fetchMembers(
  page: number,
  search: string,
  status?: string
): Promise<MembersListResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const { data } = await api.get<MembersListResponse>(
    `/api/members?${params.toString()}`
  );
  return data;
}

export async function fetchMemberStats(): Promise<MemberStats> {
  const { data } = await api.get<MemberStats>("/api/members/stats");
  return data;
}

export async function fetchMemberById(id: string): Promise<Member> {
  const { data } = await api.get<{ member: Member }>(`/api/members/${id}`);
  return data.member;
}

export async function createMember(payload: {
  fullName: string;
  email: string;
  phoneNumber: string;
}): Promise<{ message: string; member: Member }> {
  const { data } = await api.post<{ message: string; member: Member }>(
    "/api/members",
    payload
  );
  return data;
}

export async function updateMemberStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
): Promise<{ message: string; member: Member }> {
  const { data } = await api.patch<{ message: string; member: Member }>(
    `/api/members/${id}/status`,
    { status }
  );
  return data;
}

export async function deleteMember(
  id: string
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/api/members/${id}`
  );
  return data;
}
