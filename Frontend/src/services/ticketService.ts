import axios from 'axios';

const normalizeApiUrl = (rawUrl: string | undefined): string | null => {
  if (!rawUrl) return null;
  const trimmed = rawUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
};

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL) || 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export interface JenisPengajuan {
    id: number;
    nama_jenis: string;
}

export interface Dosen {
    id_user: string;
    nama: string;
}

export interface TicketRequest {
  judul: string;
  deskripsi: string;
  id_jenis_pengajuan: number;
  id_dosen: number;
  tanggal_bimbingan?: string | null;
  file_name?: string | null;
  file_data?: string | null;
}

export interface TicketResponse {
    id: number;
    topik?: string;
    subjek: string;
    status: 'PENDING' | 'RESOLVED' | 'REJECTED';
    deskripsi?: string;
    mahasiswa_nama?: string;
    file_name?: string;
    dosen_id?: number;
    tanggal_bimbingan?: string;
    komentar_dosen?: string;
    created_at: string;
}

export interface TicketDetailResponse extends TicketResponse {
    file_data?: string;
}

export interface DashboardStats {
  total_tickets: number;
  pending_tickets: number;
  completed_tickets: number;
  rejected_tickets: number;
}

export interface TicketStatusUpdateRequest {
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  komentar_dosen?: string | null;
}

const getAuthHeader = () => {
    const token = localStorage.getItem('token'); // Ambil token dari login
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

export const ticketService = {
  // 1. Ambil Kategori Pengajuan 
  getTicketTypes: async (): Promise<JenisPengajuan[]> => {
    const response = await api.get(`/tickets/types`, getAuthHeader());
    return response.data;
  },

  // 2. Ambil Daftar Dosen 
  getLecturers: async (): Promise<Dosen[]> => {
    const response = await api.get(`/tickets/lecturers`, getAuthHeader());
    return response.data;
  },

  // 3. Kirim Pengajuan Baru 
  createTicket: async (data: TicketRequest): Promise<TicketResponse> => {
    const response = await api.post(`/tickets/`, data, getAuthHeader());
    return response.data;
  },

  // 4. Ambil Statistik Dashboard 
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get(`/tickets/stats`, getAuthHeader());
    return response.data;
  },

  // 5. Ambil Daftar Riwayat Tiket Saya
  getMyTickets: async (): Promise<TicketResponse[]> => {
    const response = await api.get(`/tickets/my-tickets`, getAuthHeader());
    return response.data;
  },

  // 6. Ambil Detail Tiket Berdasarkan ID
  getTicketById: async (id: string | number): Promise<TicketDetailResponse> => {
    const response = await api.get(`/tickets/${id}`, getAuthHeader());
    return response.data;
  },

  // 7. Update status tiket oleh dosen
  updateTicketStatus: async (
    id: string | number,
    data: TicketStatusUpdateRequest
  ): Promise<TicketResponse> => {
    const response = await api.patch(`/tickets/${id}/status`, data, getAuthHeader());
    return response.data;
  }
};
