'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  File,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import type { ProfileDocument } from '@/types/profile';

interface DocumentsTabProps {
  documents: ProfileDocument[];
}

const STATUS_STYLE: Record<
  ProfileDocument['status'],
  { className: string; icon: React.ReactNode }
> = {
  UPLOADED: {
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Clock className="w-3 h-3" />,
  },
  PROCESSING: {
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  VERIFIED: {
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  REJECTED: {
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />,
  },
  EXPIRED: {
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-400" />;
  return <FileText className="w-5 h-5 text-gray-400" />;
}

export function DocumentsTab({ documents: initialDocs }: DocumentsTabProps) {
  const t = useTranslations('documents');
  const [docs, setDocs] = useState<ProfileDocument[]>(initialDocs);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewDoc, setViewDoc] = useState<ProfileDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        // TODO: replace with API call  upload files to server/storage
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const newDocs: ProfileDocument[] = Array.from(files).map((file) => ({
          documentId: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          originalName: file.name,
          type: 'OTHER',
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          status: 'UPLOADED',
        }));
        setDocs((prev) => [...newDocs, ...prev]);
        toast.success(t('upload.success', { count: files.length }));
      } catch {
        toast.error(t('upload.failed'));
      } finally {
        setUploading(false);
      }
    },
    [t],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      // TODO: replace with API call
      await new Promise((resolve) => setTimeout(resolve, 700));
      setDocs((prev) => prev.filter((d) => d.documentId !== docId));
      toast.success(t('delete.success'));
    } catch {
      toast.error(t('delete.failed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (doc: ProfileDocument) => {
    // TODO: replace with API call  generate signed URL and trigger download
    toast.info(t('download.downloading', { name: doc.originalName }));
  };

  const tableHeaders = [
    t('list.headers.name'),
    t('list.headers.type'),
    t('list.headers.uploadDate'),
    t('list.headers.expiryDate'),
    t('list.headers.status'),
    t('list.headers.actions'),
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            {t('upload.title')}
          </CardTitle>
          <CardDescription>{t('upload.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 px-6 cursor-pointer transition-all ${
              dragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          >
            {uploading ? (
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            ) : (
              <Upload className={`w-10 h-10 ${dragging ? 'text-blue-500' : 'text-gray-300'}`} />
            )}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {uploading ? t('upload.uploading') : t('upload.dragDrop')}
              </p>
              <p className="text-xs text-gray-400 mt-1">{t('upload.formats')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <File className="w-4 h-4 text-gray-500" />
            {t('list.title')}
            <Badge className="ml-1 bg-gray-100 text-gray-600 border-gray-200 text-xs">{docs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-sm">{t('list.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {tableHeaders.map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 last:pr-0 font-medium text-gray-500 text-xs uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {docs.map((doc) => {
                    const style = STATUS_STYLE[doc.status];
                    return (
                      <tr key={doc.documentId} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <DocIcon mimeType={doc.mimeType} />
                            <div>
                              <p className="font-medium text-gray-800 truncate max-w-45">{doc.originalName}</p>
                              <p className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                          {t(`types.${doc.type}`)}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                          {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : ''}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={`${style.className} flex items-center gap-1 w-fit`}>
                            {style.icon}
                            {t(`statuses.${doc.status}`)}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => setViewDoc(doc)}
                              title={t('list.headers.status')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-500 hover:text-green-600 hover:bg-green-50"
                              onClick={() => handleDownload(doc)}
                              title={t('list.headers.actions')}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(doc.documentId)}
                              disabled={deletingId === doc.documentId}
                              title={t('delete.success')}
                            >
                              {deletingId === doc.documentId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Document Modal */}
      <Dialog open={!!viewDoc} onOpenChange={(open) => { if (!open) setViewDoc(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewDoc && <DocIcon mimeType={viewDoc.mimeType} />}
              {viewDoc?.originalName}
            </DialogTitle>
            <DialogDescription>
              {viewDoc && t(`types.${viewDoc.type}`)}  {viewDoc && formatFileSize(viewDoc.fileSize)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center min-h-75">
            {viewDoc?.mimeType?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewDoc.url ?? '/placeholder-doc.png'}
                alt={viewDoc.originalName}
                className="max-h-100 object-contain rounded"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                <FileText className="w-16 h-16 text-gray-200" />
                <p className="text-sm">{t('preview.notAvailable')}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewDoc && handleDownload(viewDoc)}
                  className="mt-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('preview.downloadToView')}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
