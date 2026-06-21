
import { useCallback, useRef, useState } from "react";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import { AudioProcessingError, formatFileSize, processDemoUpload } from "@/lib/studio/audio-analysis";
import { saveAudioBlob } from "@/lib/studio/audio-db";
import type { DemoAudioMeta } from "@/types/studio";
import { cn } from "@/lib/utils";

interface AudioUploaderProps {
  projectId: string;
  versionId: string;
  onUploaded: (meta: DemoAudioMeta) => void;
  existing?: DemoAudioMeta;
}

export function AudioUploader({
  projectId,
  versionId,
  onUploaded,
  existing,
}: AudioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setProcessing(true);
      setError(null);
      try {
        const { meta, mixBlob } = await processDemoUpload(file);
        await saveAudioBlob(projectId, versionId, "mix", mixBlob);
        onUploaded(meta);
      } catch (err) {
        const msg =
          err instanceof AudioProcessingError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed";
        setError(msg);
      } finally {
        setProcessing(false);
      }
    },
    [projectId, versionId, onUploaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !processing && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          dragging
            ? "border-accent bg-accent-muted"
            : "border-border bg-surface hover:border-accent/40 hover:bg-surface-elevated",
          processing && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        {processing ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-accent-light" />
            <p className="mt-3 text-sm font-medium">Processing demo…</p>
            <p className="mt-1 text-xs text-muted">Extracting waveform & BPM</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-accent-light" />
            <p className="mt-3 text-sm font-medium">
              {existing ? "Replace demo" : "Drop your demo here"}
            </p>
            <p className="mt-1 text-xs text-muted">
              MP3, WAV, M4A · max {formatFileSize(20 * 1024 * 1024)}
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}