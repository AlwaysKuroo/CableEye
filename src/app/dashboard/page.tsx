
'use client';

import CableReportForm, { ReportFormValues } from '@/components/cable-report-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Map, ListChecks, MapPin, Tag, Camera, FileText, CheckCircle, AlertTriangle, HelpCircle, Edit3 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Report {
  id: string;
  latitude: string;
  longitude: string;
  photo?: File; 
  photoUrl?: string; 
  photoFileName?: string;
  status: 'identified' | 'doubtful' | 'not_yet_identified';
  description: string;
  timestamp: Date;
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

  useEffect(() => {
    setClientMounted(true);
    const storedReports = localStorage.getItem('cableReports');
    if (storedReports) {
      try {
        const parsedReports = JSON.parse(storedReports).map((report: any) => ({
            ...report, 
            timestamp: new Date(report.timestamp),
            // photoUrl might be an object URL which could be invalid on reload.
            // For robust prototype, store as base64 or re-upload. Current behavior is kept.
        }));
        setReports(parsedReports);
      } catch (error) {
        console.error("Failed to parse reports from localStorage", error);
        localStorage.removeItem('cableReports'); // Clear corrupted data
      }
    }
  }, []);

  useEffect(() => {
    if(clientMounted) {
      localStorage.setItem('cableReports', JSON.stringify(reports.map(r => ({...r, photo: undefined})))); // Don't store File object
    }
  }, [reports, clientMounted]);

  const openAddNewReportForm = () => {
    setEditingReport(null);
    setIsFormOpen(true);
  };

  const openEditReportForm = (report: Report) => {
    setEditingReport(report);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (formData: ReportFormValues, reportIdToEdit?: string) => {
    if (reportIdToEdit) { // Editing existing report
      setReports(prevReports =>
        prevReports.map(r => {
          if (r.id === reportIdToEdit) {
            const updatedReport: Report = {
              ...r,
              latitude: formData.latitude,
              longitude: formData.longitude,
              status: formData.status,
              description: formData.description,
              timestamp: new Date(), // Update timestamp on edit
            };
            if (formData.photo) { // If a new photo was uploaded
              // Revoke old object URL if it exists and is a blob
              if (updatedReport.photoUrl && updatedReport.photoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(updatedReport.photoUrl);
              }
              updatedReport.photoUrl = URL.createObjectURL(formData.photo);
              updatedReport.photoFileName = formData.photo.name;
            }
            // The 'photo' File object itself is not stored in 'reports' state
            return updatedReport;
          }
          return r;
        })
      );
    } else { // Adding new report
      const newReport: Report = {
        id: Date.now().toString(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        status: formData.status,
        description: formData.description,
        photoUrl: formData.photo ? URL.createObjectURL(formData.photo) : undefined,
        photoFileName: formData.photo ? formData.photo.name : undefined,
        timestamp: new Date(),
      };
      setReports(prevReports => [newReport, ...prevReports]);
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
                {clientMounted && reports.length > 0 && `Currently showing ${reports.length} report(s) on map.`}
                 {clientMounted && reports.length === 0 && "No reports to display on map yet."}
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
            {clientMounted && reports.length === 0 ? (
              <p className="text-muted-foreground font-body text-center py-8">No reports submitted yet.</p>
            ) : (
              <div className="max-h-[30rem] space-y-4 overflow-y-auto">
                {reports.slice(0, 5).map(report => (
                  <div key={report.id} className="rounded-md border p-4 bg-background hover:bg-muted/30 transition-colors">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                        {statusIcons[report.status]}
                        <span className="font-headline">{statusText[report.status]}</span>
                      </div>
                       <Button variant="ghost" size="sm" onClick={() => openEditReportForm(report)} aria-label="Edit report">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                     <p className="text-xs text-muted-foreground mb-1">{report.timestamp.toLocaleDateString()} {report.timestamp.toLocaleTimeString()}</p>
                    <p className="mb-1 text-sm font-body line-clamp-2 text-foreground/90" title={report.description}>
                      <FileText className="inline mr-1.5 h-4 w-4 text-muted-foreground" /> {report.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="inline mr-1.5 h-3 w-3" /> Lat: {report.latitude}, Lon: {report.longitude}
                    </p>
                    {report.photoUrl && (
                      <div className="mt-2">
                         <Image data-ai-hint="cable electrical" src={report.photoUrl} alt={report.photoFileName || "Anomaly photo"} width={80} height={80} className="rounded-md object-cover h-20 w-20 border" onError={(e) => { e.currentTarget.style.display = 'none'; /* Hide if image fails to load */}}/>
                         {report.photoFileName && <p className="text-xs text-muted-foreground mt-1 truncate w-20" title={report.photoFileName}>{report.photoFileName}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {clientMounted && reports.length > 5 && (
                 <Button variant="link" className="mt-4 w-full text-accent">View All Reports</Button> // This button functionality is not implemented yet
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
