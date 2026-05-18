import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/ticketService';
import { AlertCircle, Plus, ChevronDown, FileText, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
// import { topikBantuan, daftarDosen } from '../data/dummy';

export default function BukaTiketBaru() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listDosen, setListDosen] = useState([]);
  const [listTopik, setListTopik] = useState([]);
  const [loadError, setLoadError] = useState('');

  const fallbackTopik = [
    { id: 1, nama_jenis: 'Pengajuan Surat' },
    { id: 2, nama_jenis: 'Pengajuan Bimbingan' },
    { id: 3, nama_jenis: 'Pengajuan Akademik' },
  ];

  const describeError = (err) => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail;
    const message = err?.message;
    const label = status ? `HTTP ${status}` : 'Error';
    return `${label}${detail ? `: ${detail}` : message ? `: ${message}` : ''}`;
  };

  // const [form, setForm] = useState({
  //   topik: '',
  //   dosen: '',
  //   subject: '',
  //   deskripsi: '',
  //   tanggal: '',
  // });

  const [form, setForm] = useState({
    id_jenis_pengajuan: '',
    id_dosen: '',
    subject: '',
    deskripsi: '',
    tanggal_bimbingan: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try{
        setLoadError('');
        const [dosenResult, topikResult] = await Promise.allSettled([
          ticketService.getLecturers(),
          ticketService.getTicketTypes(),
        ]);

        if (dosenResult.status === 'fulfilled') {
          const uniqueDosen = Array.from(
            new Map((dosenResult.value || []).map((d) => [String(d.id_user), d])).values()
          );
          setListDosen(uniqueDosen);
        } else {
          setListDosen([]);
        }

        if (topikResult.status === 'fulfilled') {
          setListTopik(topikResult.value || []);
        } else {
          setListTopik(fallbackTopik);
        }

        if (dosenResult.status === 'rejected' || topikResult.status === 'rejected') {
          const parts = [];
          if (dosenResult.status === 'rejected') parts.push(`Dosen: ${describeError(dosenResult.reason)}`);
          if (topikResult.status === 'rejected') parts.push(`Topik: ${describeError(topikResult.reason)}`);
          setLoadError(parts.join(' | ') || 'Gagal memuat data dosen/topik. Pastikan backend berjalan dan VITE_API_URL benar.');
        }
      } catch (error) {
        setListDosen([]);
        setListTopik(fallbackTopik);
        setLoadError(describeError(error) || 'Gagal memuat data dosen/topik. Pastikan backend berjalan dan VITE_API_URL benar.');
        console.error('Gagal mengambil data:', error);
      }
    };
    loadData();
  }, []);

  const [files, setFiles] = useState([]);
  const [success, setSuccess] = useState(false);

  const selectedTopikId = Number(form.id_jenis_pengajuan);
  const isSuratTopic = selectedTopikId === 1;
  const isBimbinganTopic = selectedTopikId === 2;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // const handleSubmit = () => {
  //   if (!form.topik || !form.dosen || !form.subject || !form.deskripsi) {
  //     alert('Lengkapi semua field terlebih dahulu.');
  //     return;
  //   }
  //   if (form.topik === 'Pengajuan Bimbingan' && !form.tanggal) {
  //     alert('Lengkapi tanggal bimbingan terlebih dahulu.');
  //     return;
  //   }
  //   if (isSuratTopic && files.length === 0) {
  //     alert('Silahkan upload minimal satu file untuk pengajuan surat.');
  //     return;
  //   }
  //   setSuccess(true);
  //   setTimeout(() => {
  //     navigate('/tiket');
  //   }, 1500);
  // };

  const handleSubmit = async () => {
    if (!form.id_jenis_pengajuan || !form.id_dosen || !form.subject || !form.deskripsi) {
      alert('Lengkapi semua field terlebih dahulu.');
      return;
    }

    if (isBimbinganTopic && !form.tanggal_bimbingan) {
      alert('Lengkapi tanggal bimbingan terlebih dahulu.');
      return;
    }

    try{
      let fileName = null;
      let fileData = null;

      if (isSuratTopic && files.length > 0) {
        // Hanya ambil file pertama untuk disubmit (contoh sederhana)
        const file = files[0];
        fileName = file.name;
        
        // Convert to base64
        const toBase64 = (f) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });

        fileData = await toBase64(file);
      }

      await ticketService.createTicket({
        judul: form.subject,
        deskripsi: form.deskripsi,
        id_jenis_pengajuan: parseInt(form.id_jenis_pengajuan),
        id_dosen: parseInt(form.id_dosen),
        tanggal_bimbingan: form.tanggal_bimbingan || null,
        file_name: fileName,
        file_data: fileData
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/tiket');
      }, 1500);
    } catch (error) {
      alert('Gagal mengirim tiket. Silakan cek koneksi atau RLS Supabase Anda.');
    }
  }
  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Buat Tiket Baru</h1>
          <p className="text-gray-500 text-sm mt-1">Silahkan isi formulir ini untuk membuat sebuah tiket baru.</p>
        </div>

        {/* Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 mb-6">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <span className="font-bold">Perhatian: </span>
            Pastikan secara rutin Anda mengecek tiket yang anda buat di web ini untuk melihat tanggapan atau konfirmasi dari dosen. Dosen akan menutup tiket jika tidak ada tanggapan lagi dari penanya dalam 3 hari kerja.
          </div>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
            {loadError}
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-8">
          <div className="space-y-5 sm:space-y-6">
            {/* Email */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 sm:items-center">
              <label className="text-sm font-semibold text-gray-700">Email</label>
              <div className="sm:col-span-2 text-sm text-gray-600">{user?.email}</div>
            </div>

            {/* Nama */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 sm:items-center">
              <label className="text-sm font-semibold text-gray-700">Nama</label>
              <div className="sm:col-span-2 text-sm text-gray-600">{user?.nama}</div>
            </div>

            {/* Topik */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 sm:items-center">
              <label className="text-sm font-semibold text-gray-700">Topik Bantuan</label>
              <div className="sm:col-span-2 relative">
                <select
                  value={form.id_jenis_pengajuan}
                  onChange={(e) => {
                    const nextTopik = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      id_jenis_pengajuan: nextTopik,
                      tanggal_bimbingan: Number(nextTopik) === 2 ? prev.tanggal_bimbingan : '',
                    }));
                  }}
                  className="w-full appearance-none px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700"
                >
                  <option value="">-- Pilih Topik Bantuan --</option>
                  {listTopik.map((t) => (
                    <option key={t.id} value={t.id}>{t.nama_jenis}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Dosen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 sm:items-center">
              <label className="text-sm font-semibold text-gray-700">Nama Dosen</label>
              <div className="sm:col-span-2 relative">
                <select
                  value={form.id_dosen}
                  onChange={(e) => setForm({ ...form, id_dosen: e.target.value })}
                  className="w-full appearance-none px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700"
                >
                  <option value="">-- Pilih Dosen Tujuan --</option>
                  {listDosen.map((d) => (
                    <option key={d.id_user} value={d.id_user}>{d.nama}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 sm:items-center">
              <label className="text-sm font-semibold text-gray-700">Subject</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Masukan Subjek Bantuan"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Tanggal Bimbingan */}
            {isBimbinganTopic && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 sm:items-center">
                <label className="text-sm font-semibold text-gray-700">Tanggal Bimbingan</label>
                <div className="sm:col-span-2">
                  <input
                    type="date"
                    value={form.tanggal_bimbingan}
                    onChange={(e) => setForm({ ...form, tanggal_bimbingan: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Deskripsi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <label className="text-sm font-semibold text-gray-700 sm:pt-3">Deskripsi</label>
              <div className="sm:col-span-2">
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Jelaskan permasalahan Anda secara detail...."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* File Upload */}
            {isSuratTopic && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <label className="text-sm font-semibold text-gray-700 sm:pt-3">File Pendukung</label>
                <div className="sm:col-span-2">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="cursor-pointer">
                      <FileText size={32} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-700">
                        Klik untuk upload file
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Atau drag dan drop file di sini
                      </p>
                    </label>
                  </div>
                  
                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-600">File yang diupload:</p>
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            type="button"
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
                ✓ Tiket berhasil dibuat! Mengalihkan ke halaman tiket...
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <button
                onClick={() => navigate('/tiket')}
                className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm w-full sm:w-auto"
              >
                <Plus size={16} />
                Kirim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
