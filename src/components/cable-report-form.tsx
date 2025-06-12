
'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Camera, FileText, MapPin, Tag, LocateFixed, UploadCloud, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import *  as z from 'zod';
import { useToast } from "@/hooks/use-toast";

const reportSchema = z.object({
  latitude: z.string().min(1, { message: "Latitude is required."}),
  longitude: z.string().min(1, { message: "Longitude is required."}),
  photo: z.any().optional(), 
  status: z.enum(["identified", "doubtful", "not_yet_identified"], { required_error: "Status is required."}),
  description: z.string().min(1, { message: "Description is required."}).max(500, { message: "Description too long."}),
});

export type ReportFormValues = z.infer<typeof reportSchema>;

interface FormInitialData {
  id?: string;
  latitude: string;
  longitude: string;
  photoUrl?: string; 
  photoFileName?: string; 
  status: 'identified' | 'doubtful' | 'not_yet_identified';
  description: string;
  timestamp?: Date;
}

interface CableReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmit: (data: ReportFormValues, reportIdToEdit?: string) => void;
  initialData?: FormInitialData | null; 
}

export default function CableReportForm({ isOpen, onClose, onReportSubmit, initialData }: CableReportFormProps) {
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      status: "not_yet_identified",
      latitude: "",
      longitude: "",
      description: "",
      photo: undefined,
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const formValues: Partial<ReportFormValues> = { 
          latitude: initialData.latitude,
          longitude: initialData.longitude,
          status: initialData.status,
          description: initialData.description,
        };
        reset(formValues);
        
        if (initialData.photoUrl && initialData.photoUrl.startsWith('blob:')) {
            setPhotoPreview(initialData.photoUrl);
            setFileName(initialData.photoFileName || 'Existing photo');
        } else if (initialData.photoFileName) {
            setPhotoPreview(null); 
            setFileName(initialData.photoFileName);
        } else {
            setPhotoPreview(null);
            setFileName(null);
        }
      } else {
        reset({ status: "not_yet_identified", latitude: '', longitude: '', description: '', photo: undefined });
        setPhotoPreview(null);
        setFileName(null);
      }
    }
  }, [isOpen, initialData, reset]);
  
  useEffect(() => {
    let currentPhotoPreview = photoPreview;
    let isObjectURL = currentPhotoPreview?.startsWith('blob:');

    return () => {
      if (currentPhotoPreview && isObjectURL) {
        URL.revokeObjectURL(currentPhotoPreview);
      }
    };
  }, [photoPreview]);


  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setValue('photo', file, { shouldValidate: true });
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview); 
      }
      setPhotoPreview(URL.createObjectURL(file));
      setFileName(file.name);
    }
  };

  const handleCaptureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('latitude', position.coords.latitude.toString(), { shouldValidate: true });
          setValue('longitude', position.coords.longitude.toString(), { shouldValidate: true });
          toast({
            title: "Location Captured",
            description: `Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}`,
          });
        },
        (error) => {
          console.error("Error getting location: ", error);
          toast({
            title: "Location Error",
            description: "Could not retrieve current location.",
            variant: "destructive",
          });
        }
      );
    } else {
       toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
    }
  };

  const handleCameraCaptureClick = () => {
    cameraInputRef.current?.click();
  };

  const processSubmit: SubmitHandler<ReportFormValues> = (data) => {
    onReportSubmit(data, initialData?.id);
    onClose(); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-primary" /> 
            {initialData?.id ? 'Edit Anomaly Report' : 'Report New Anomaly'}
          </DialogTitle>
          <DialogDescription className="font-body">
            {initialData?.id ? 'Update the details of the cable anomaly.' : 'Fill in the details of the cable anomaly. All fields are required.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="font-headline flex items-center"><MapPin className="mr-2 h-4 w-4" />Latitude</Label>
              <Input id="latitude" placeholder="e.g., 34.0522" {...register('latitude')} className={errors.latitude ? 'border-destructive' : ''} />
              {errors.latitude && <p className="text-sm text-destructive">{errors.latitude.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude" className="font-headline flex items-center"><MapPin className="mr-2 h-4 w-4" />Longitude</Label>
              <Input id="longitude" placeholder="e.g., -118.2437" {...register('longitude')} className={errors.longitude ? 'border-destructive' : ''} />
              {errors.longitude && <p className="text-sm text-destructive">{errors.longitude.message}</p>}
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleCaptureLocation} className="w-full text-accent border-accent hover:bg-accent/10">
            <LocateFixed className="mr-2 h-4 w-4" /> Capture Current Location
          </Button>

          <div className="space-y-2">
            <Label className="font-headline flex items-center"><Camera className="mr-2 h-4 w-4" />Photo Evidence</Label>
            
            {photoPreview && (
              <div className="mb-2 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Preview" className="max-h-40 rounded-md object-contain border" />
              </div>
            )}
            {fileName && !photoPreview && (
              <div className="mb-2 text-center text-sm text-muted-foreground">
                Current file: {fileName}
                {initialData?.id && initialData.photoFileName && fileName === initialData.photoFileName && <span className="text-amber-500"> (This is the existing photo. Upload/capture new to replace.)</span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground"><span className="font-semibold">Upload from File</span></p>
                    <p className="text-xs text-muted-foreground">Drag & drop or click</p>
                </label>
                <Input id="photo-upload" type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCameraCaptureClick}
                  className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted hover:bg-muted/80"
                >
                  <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground"><span className="font-semibold">Capture with Camera</span></p>
                  <p className="text-xs text-muted-foreground">Use device camera</p>
                </Button>
                <Input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handlePhotoChange}
                />
              </div>
            </div>
            {errors.photo && <p className="text-sm text-destructive">{errors.photo.message?.toString()}</p>}
            <p className="text-xs text-muted-foreground text-center mt-1">For persistent photo storage, Firebase Storage integration is needed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="font-headline flex items-center"><Tag className="mr-2 h-4 w-4" />Status</Label>
            <Select 
              defaultValue={initialData?.status || "not_yet_identified"} 
              onValueChange={(value) => setValue('status', value as "identified" | "doubtful" | "not_yet_identified", { shouldValidate: true })}
            >
              <SelectTrigger id="status" className={errors.status ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identified"><CheckCircle className="inline mr-2 h-4 w-4 text-green-500" />Identified</SelectItem>
                <SelectItem value="doubtful"><HelpCircle className="inline mr-2 h-4 w-4 text-yellow-500" />Doubtful</SelectItem>
                <SelectItem value="not_yet_identified"><AlertTriangle className="inline mr-2 h-4 w-4 text-orange-500" />Not Yet Identified</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-headline flex items-center"><FileText className="mr-2 h-4 w-4" />Description</Label>
            <Textarea id="description" placeholder="Describe the anomaly, e.g., 'Loose cable hanging near transformer, seems recently installed.'" {...register('description')} rows={4} className={errors.description ? 'border-destructive' : ''} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="font-headline">{initialData?.id ? 'Update Report' : 'Submit Report'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

