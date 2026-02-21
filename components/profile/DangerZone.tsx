'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AlertTriangle, Download, UserX, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Confirmation Dialogs ─────────────────────────────────────────

function DeactivateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      // TODO: replace with API call
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success('Account deactivated. You have been signed out.');
      router.push('/auth/login');
    } catch {
      toast.error('Failed to deactivate account.');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <UserX className="w-5 h-5" />
            Deactivate Account
          </DialogTitle>
          <DialogDescription>
            Your account will be deactivated and you will be logged out immediately. You can reactivate it
            by contacting support or logging in again within 30 days.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeactivate}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserX className="w-4 h-4 mr-2" />}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const CONFIRM_TEXT = 'DELETE MY ACCOUNT';
  const router = useRouter();

  const handleClose = () => {
    setStep(1);
    setConfirmation('');
    onClose();
  };

  const handleDelete = async () => {
    if (confirmation !== CONFIRM_TEXT) return;
    setLoading(true);
    try {
      // TODO: replace with API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Account deleted. All your data has been removed.');
      router.push('/');
    } catch {
      toast.error('Failed to delete account. Please contact support.');
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Delete Account Permanently
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <>
            <DialogDescription className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold text-red-600">⚠️ This action cannot be undone.</p>
              <p>
                Deleting your account will permanently remove all your personal data,
                claims history, documents, and associated records. This process is irreversible.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-500 text-xs mt-2">
                <li>All personal information will be erased</li>
                <li>All claims and documents will be deleted</li>
                <li>Linked policies will be unlinked</li>
                <li>You will lose access immediately</li>
              </ul>
            </DialogDescription>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                I understand, continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-700">
                To confirm deletion, type{' '}
                <span className="font-mono font-bold text-red-600">{CONFIRM_TEXT}</span> below:
              </p>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={CONFIRM_TEXT}
                className="font-mono"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={confirmation !== CONFIRM_TEXT || loading}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Account
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export function DangerZone() {
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      // TODO: replace with API call — generate and download data export
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Simulate initiating a file download
      const blob = new Blob(
        [JSON.stringify({ message: 'Your data export would be here.' }, null, 2)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data export downloaded.');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-red-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Deactivate */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-orange-100 bg-orange-50/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-orange-500" />
                  Deactivate Account
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Temporarily deactivate your account. You can reactivate within 30 days.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeactivate(true)}
                className="border-orange-300 text-orange-600 hover:bg-orange-100 hover:border-orange-400 shrink-0"
              >
                Deactivate Account
              </Button>
            </div>

            {/* Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  Export My Data
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Download a copy of all your personal data and claims history (JSON format).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={exporting}
                className="border-blue-300 text-blue-600 hover:bg-blue-100 hover:border-blue-400 shrink-0"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            </div>

            {/* Delete */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Delete Account
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="shrink-0"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeactivateDialog open={showDeactivate} onClose={() => setShowDeactivate(false)} />
      <DeleteDialog open={showDelete} onClose={() => setShowDelete(false)} />
    </>
  );
}
