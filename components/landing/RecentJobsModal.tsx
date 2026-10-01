'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Globe,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface RecentJob {
  id: string;
  url: string;
  hostname: string;
  addedAt: number;
  status?: string;
  techStack?: string;
  size?: string;
  pages?: number;
  images?: number;
  files?: number;
}

interface RecentJobsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: RecentJob[];
  onClearJobs: () => void;
  onDeleteJob: (id: string) => void;
}

export function RecentJobsModal({
  open,
  onOpenChange,
  jobs,
  onClearJobs,
  onDeleteJob,
}: RecentJobsModalProps) {
  const router = useRouter();

  const handleOpenJob = (id: string) => {
    onOpenChange(false);
    router.push(`/mirror/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-foreground" />
            Recent Capture Jobs
          </div>
          {jobs.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearJobs}
              className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear All
            </Button>
          )}
        </DialogTitle>
        <DialogDescription className="text-xs">
          Locally saved capture sessions and mirror snapshots.
        </DialogDescription>
      </DialogHeader>

      <div className="py-2 max-h-[60vh] overflow-y-auto space-y-2">
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No capture jobs recorded yet.
          </div>
        ) : (
          jobs.map((job) => {
            const isCompleted = job.status === 'completed';
            const isFailed = job.status === 'failed';
            const isRunning = job.status === 'downloading';

            return (
              <div
                key={job.id}
                onClick={() => handleOpenJob(job.id)}
                className="p-3 rounded-lg border border-border bg-card hover:border-foreground/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-foreground truncate font-mono">
                      {job.hostname || job.url}
                    </span>
                    <Badge
                      variant={isCompleted ? 'success' : isFailed ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1.5 py-0 font-mono uppercase"
                    >
                      {job.status || 'saved'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                    <span>{new Date(job.addedAt).toLocaleDateString()}</span>
                    {job.pages !== undefined && job.pages > 0 && (
                      <span>{job.pages} pages</span>
                    )}
                    {job.size && <span>{job.size}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteJob(job.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="text-xs"
        >
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
