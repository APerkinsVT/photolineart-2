import { useCallback, useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface UploadDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => Promise<void> | void;
  isBusy?: boolean;
}

export function UploadDropzone({ onFilesSelected, isBusy }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files?: FileList | File[]) => {
      if (!files || files.length === 0) {
        return;
      }
      void onFilesSelected(files);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFilesSelected],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (event.dataTransfer?.files) {
        handleFiles(event.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div
      className={cn(
        'mt-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition',
        isDragging ? 'border-brand bg-brand-subtle/30' : 'border-slate-300 bg-white',
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={onDrop}
    >
      <p className="font-display text-2xl font-semibold text-slate-900">Drop your photos</p>
      <p className="mt-2 text-sm text-slate-500">
        JPG, PNG, or WebP • up to 3MB per image • 12MB per batch
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          {isBusy ? 'Working…' : 'Choose files'}
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
          onClick={() => inputRef.current?.click()}
        >
          Browse
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files ?? undefined)}
      />
    </div>
  );
}
