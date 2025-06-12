
'use client';

import CableReportForm, { ReportFormValues } from '@/components/cable-report-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Map, ListChecks, MapPin, FileText, CheckCircle, AlertTriangle, HelpCircle, Edit3, Trash2 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string; // Firestore document ID
  latitude: string;
  longitude: string;
  photo?: File; // Hanya untuk penanganan form, tidak disimpan di Firestore
  photoUrl?: string; // Untuk pratinjau lokal atau URL Firebase Storage di masa depan
  photoFileName?: string; // Disimpan di Firestore
  status: 'identified' | 'doubtful' | 'not_yet_identified';
  description: string;
  timestamp: Date; // Dikonversi dari Firestore Timestamp untuk penggunaan klien
}

const statusIcons = {
  identified: <CheckCircle className="h-5 w-5 text-green-400" />,
  doubtful: <HelpCircle className="h-5 w-5 text-yellow-400" />,
  not_yet_identified: <AlertTriangle className="h-5 w-5 text-orange-400" />,
};

const statusText = {
  identified: "Identified",
  doubtful: "Doubtful",
  not_yet_identified: "Not Yet Identified",
}

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [clientMounted, setClientMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const reportsCollection = collection(db, 'reports');
      const q = query(reportsCollection, orderBy('timestamp', 'desc'));
      const reportSnapshot = await getDocs(q);
      const reportList = reportSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(), // Konversi Firestore Timestamp ke Date
          // photoUrl tidak diambil dari Firestore di sini, akan di-handle oleh Firebase Storage nanti
        } as Report;
      });
      setReports(reportList);
    } catch (error) {
      console.error("Error fetching reports from Firestore: ", error);
      toast({
        title: "Error Fetching Data",
        description: "Could not fetch reports from the database.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    setClientMounted(true);
    fetchReports();
  }, [fetchReports]);

  const openAddNewReportForm = () => {
    setEditingReport(null);
    setIsFormOpen(true);
  };

  const openEditReportForm = (report: Report) => {
    setEditingReport(report);
    setIsFormOpen(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      setReports(prevReports => prevReports.filter(r => r.id !== reportId));
      toast({
        title: "Report Deleted",
        description: "The report has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting report: ", error);
      toast({
        title: "Error Deleting Report",
        description: "Could not delete the report.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (formData: ReportFormValues, reportIdToEdit?: string) => {
    const reportData: Omit<Report, 'id' | 'timestamp' | 'photo' | 'photoUrl'> & { timestamp: any, photoFileName?: string } = {
      latitude: formData.latitude,
      longitude: formData.longitude,
      status: formData.status,
      description: formData.description,
      timestamp: serverTimestamp(), // Gunakan server timestamp Firestore
      photoFileName: formData.photo ? formData.photo.name : (editingReport?.photoFileName || undefined),
    };

    try {
      if (reportIdToEdit) { // Mengedit laporan yang ada
        const reportRef = doc(db, 'reports', reportIdToEdit);
        await updateDoc(reportRef, reportData);
        
        // Perbarui state lokal
        setReports(prevReports =>
          prevReports.map(r => {
            if (r.id === reportIdToEdit) {
              const updatedReport: Report = {
                ...r,
                ...formData,
                timestamp: new Date(), // Perkiraan waktu, akan disinkronkan saat fetch berikutnya
                photoFileName: formData.photo ? formData.photo.name : r.photoFileName,
              };
              if (formData.photo) {
                if (updatedReport.photoUrl && updatedReport.photoUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(updatedReport.photoUrl);
                }
                updatedReport.photoUrl = URL.createObjectURL(formData.photo);
              }
              return updatedReport;
            }
            return r;
          })
        );
        toast({ title: "Report Updated!" });
      } else { // Menambah laporan baru
        const docRef = await addDoc(collection(db, 'reports'), reportData);
        const newReport: Report = {
          id: docRef.id,
          ...formData,
          photoUrl: formData.photo ? URL.createObjectURL(formData.photo) : undefined,
          photoFileName: formData.photo ? formData.photo.name : undefined,
          timestamp: new Date(), // Perkiraan waktu, akan disinkronkan saat fetch berikutnya
        };
        setReports(prevReports => [newReport, ...prevReports].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
        toast({ title: "Report Submitted!" });
      }
      fetchReports(); // Fetch ulang untuk data yang paling baru, termasuk timestamp server
    } catch (error) {
      console.error("Error saving report to Firestore: ", error);
      toast({
        title: "Error Saving Report",
        description: "Could not save the report to the database.",
        variant: "destructive",
      });
    }
    
    setIsFormOpen(false);
    setEditingReport(null);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-headline text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground font-body">Monitor and manage cable anomaly reports.</p>
        </div>
        <Button onClick={openAddNewReportForm} className="font-headline text-lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Report
        </Button>
      </div>

      <CableReportForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingReport}
        onReportSubmit={handleFormSubmit}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center"><Map className="mr-2 h-6 w-6 text-accent" /> Anomalies Map</CardTitle>
            <CardDescription className="font-body">Geographic overview of reported cable issues.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-96 items-center justify-center rounded-md border border-dashed bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">
                Interactive map will display anomaly locations here.
                <br />
                {clientMounted && !isLoading && reports.length > 0 && `Currently showing ${reports.length} report(s) on map.`}
                {clientMounted && !isLoading && reports.length === 0 && "No reports to display on map yet."}
                {isLoading && "Loading map data..."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center"><ListChecks className="mr-2 h-6 w-6 text-accent" /> Recent Reports</CardTitle>
            <CardDescription className="font-body">Latest submitted cable anomalies.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground font-body text-center py-8">Loading reports...</p>}
            {!isLoading && clientMounted && reports.length === 0 && (
              <p className="text-muted-foreground font-body text-center py-8">No reports submitted yet.</p>
            )}
            {!isLoading && clientMounted && reports.length > 0 && (
              <div className="max-h-[30rem] space-y-4 overflow-y-auto">
                {reports.slice(0, 5).map(report => (
                  <div key={report.id} className="rounded-md border p-4 bg-background hover:bg-muted/30 transition-colors">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                        {statusIcons[report.status]}
                        <span className="font-headline">{statusText[report.status]}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditReportForm(report)} aria-label="Edit report">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteReport(report.id)} aria-label="Delete report" className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                     <p className="text-xs text-muted-foreground mb-1">{report.timestamp.toLocaleDateString()} {report.timestamp.toLocaleTimeString()}</p>
                    <p className="mb-1 text-sm font-body line-clamp-2 text-foreground/90" title={report.description}>
                      <FileText className="inline mr-1.5 h-4 w-4 text-muted-foreground" /> {report.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="inline mr-1.5 h-3 w-3" /> Lat: {report.latitude}, Lon: {report.longitude}
                    </p>
                    {report.photoUrl && report.photoUrl.startsWith('blob:') && ( // Hanya tampilkan pratinjau blob lokal
                      <div className="mt-2">
                         <Image data-ai-hint="cable electrical" src={report.photoUrl} alt={report.photoFileName || "Anomaly photo"} width={80} height={80} className="rounded-md object-cover h-20 w-20 border" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                         {report.photoFileName && <p className="text-xs text-muted-foreground mt-1 truncate w-20" title={report.photoFileName}>{report.photoFileName}</p>}
                      </div>
                    )}
                    {!report.photoUrl && report.photoFileName && ( // Tampilkan nama file jika URL blob tidak ada (mis. setelah refresh)
                       <div className="mt-2">
                        <p className="text-xs text-muted-foreground italic"><Camera className="inline mr-1 h-3 w-3" /> {report.photoFileName} (preview unavailable)</p>
                        <p className="text-xs text-muted-foreground">Proper photo display requires Firebase Storage integration.</p>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {clientMounted && !isLoading && reports.length > 5 && (
                 <Button variant="link" className="mt-4 w-full text-accent">View All Reports</Button>
            )}
          </CardContent>
        </Card>
      </div>
       <div className="mt-8 p-4 border border-dashed rounded-md bg-muted/30">
        <h3 className="font-headline text-lg text-accent">Catatan Penting (Firestore & Foto):</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
            <li>Data laporan sekarang disimpan di Cloud Firestore. Pastikan Anda telah mengkonfigurasi file `.env.local` dengan kredensial Firebase Anda.</li>
            <li>Saat ini, hanya nama file foto yang disimpan di Firestore. File foto aktual tidak disimpan.</li>
            <li>Untuk penyimpanan dan pengambilan foto yang persisten, integrasi dengan **Firebase Storage** diperlukan sebagai langkah berikutnya.</li>
            <li>Pratinjau foto yang Anda lihat setelah mengunggah adalah URL objek lokal dan akan hilang jika halaman dimuat ulang sebelum Firebase Storage diimplementasikan.</li>
        </ul>
      </div>
    </div>
  );
}
