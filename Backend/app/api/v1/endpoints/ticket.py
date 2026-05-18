from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db # Benar

from app.schemas.ticket import (
    TicketCreate,
    TicketResponse,
    TicketDetailResponse,
    TicketUpdateStatus,
    DashboardStats
)

from app.repositories.ticket import TicketRepository
from app.models.user import User, Dosen

from app.api.v1.deps import get_current_user

router = APIRouter()

# Schemas for responses
from pydantic import BaseModel

class JenisPengajuan(BaseModel):
    id: int
    nama_jenis: str

class DosenResponse(BaseModel):
    id_user: int
    nama: str

# ENDPOINT: AMBIL DAFTAR JENIS PENGAJUAN (TOPIK)
@router.get("/types", response_model=List[JenisPengajuan])
def get_ticket_types(db: Session = Depends(get_db)):
    # Return hardcoded types sesuai dengan yang digunakan di frontend
    return [
        {"id": 1, "nama_jenis": "Pengajuan Surat"},
        {"id": 2, "nama_jenis": "Pengajuan Bimbingan"},
        {"id": 3, "nama_jenis": "Pengajuan Akademik"},
    ]

# ENDPOINT: AMBIL DAFTAR DOSEN
@router.get("/lecturers", response_model=List[DosenResponse])
def get_lecturers(db: Session = Depends(get_db)):
    lecturers = (
        db.query(User.id_user, User.nama)
        .filter(User.role == "DOSEN")
        .distinct()
        .order_by(User.nama.asc(), User.id_user.asc())
        .all()
    )
    return [{"id_user": l.id_user, "nama": l.nama} for l in lecturers]

# ENDPOINT: BUAT TIKET BARU 
@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_new_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    is_bimbingan_topic = ticket_in.id_jenis_pengajuan == 2

    if is_bimbingan_topic and not ticket_in.tanggal_bimbingan:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tanggal bimbingan wajib diisi untuk topik Pengajuan Bimbingan."
        )

    if not is_bimbingan_topic:
        ticket_in.tanggal_bimbingan = None

    return TicketRepository.create_ticket(
        db=db,
        ticket_data=ticket_in,
        mahasiswa_id=current_user.id_user
    )

# ENDPOINT: AMBIL STATISTIK DASHBOARD
@router.get("/stats", response_model=DashboardStats)
def get_my_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    return TicketRepository.get_dashboard_stats(db=db, user_id=current_user.id_user, role=role)

# ENDPOINT: DAFTAR RIWAYAT TICKET
@router.get("/my-tickets", response_model=List[TicketResponse])
def get_all_my_tickets(
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    return TicketRepository.get_tickets_by_user(
        db=db,
        user_id=current_user.id_user,
        role=role
    )

# ENDPOINT: AMBIL DETAIL TICKET BESERTA FILE
@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket_detail(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    role = (current_user.role or "").upper()
    ticket = TicketRepository.get_ticket_by_id(db=db, ticket_id=ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Tiket tidak ditemukan")
    if role == "DOSEN" and ticket.dosen_id != current_user.id_user:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    if role == "MAHASISWA" and ticket.mahasiswa_id != current_user.id_user:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return ticket

#ENDPOINT: UPDATE STATUS TICKET (DOSEN)
@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: int,
    update_data: TicketUpdateStatus,
    db: Session = Depends(get_db),
    current_user: any = Depends(get_current_user)
):
    role = (current_user.role or "").upper()

    if role != "DOSEN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya dosen yang dapat memproses pengajuan"
        )
    
    updated_ticket = TicketRepository.update_ticket_status(
        db=db,
        ticket_id=ticket_id,
        dosen_id=current_user.id_user,
        update_data=update_data
    )

    if not updated_ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tiket tidak ditemukan"
        )
    
    return updated_ticket
