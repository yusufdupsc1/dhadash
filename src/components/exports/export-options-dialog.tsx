/**
 * Export Options Dialog Component
 * Provides advanced export options, filters, and preview
 */

"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export interface ExportOptions {
  gdprMinimalMode: boolean;
  classId?: string;
  status?: string;
  search?: string;
}

interface ExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: "STUDENT_LIST" | "ATTENDANCE_REGISTER";
  onExport: (options: ExportOptions) => Promise<void>;
  isLoading?: boolean;
}

export function ExportOptionsDialog({
  open,
  onOpenChange,
  exportType,
  onExport,
  isLoading = false,
}: ExportOptionsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<ExportOptions>({
    gdprMinimalMode: false,
  });

  const handleExport = () => {
    startTransition(async () => {
      try {
        await onExport(options);
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Export failed");
      }
    });
  };

  const pending = isPending || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
          <DialogDescription>
            Configure export settings and filters before downloading
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* GDPR Mode */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={options.gdprMinimalMode}
                onChange={(e) =>
                  setOptions({ ...options, gdprMinimalMode: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">GDPR Minimal Mode</p>
                <p className="text-xs text-blue-800">
                  Excludes sensitive data: phone, address, DOB, guardian info
                </p>
              </div>
            </label>
          </div>

          {/* Warning for large exports */}
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Large exports may take a few minutes to generate. Do not close this window.
            </p>
          </div>

          {/* Export button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing Export...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export {exportType === "STUDENT_LIST" ? "Students" : "Attendance"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
