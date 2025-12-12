import { useCallback, useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface UploadDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => Promise<void> | void;
  currentCount?: number;
}

export function UploadDropzone({ onFilesSelected, currentCount = 0 }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const maxPhotos = 10;
  const buttonLabel =
    currentCount > 0 && currentCount < maxPhotos ? 'Add more photos' : 'Choose photos now';

  const handleFiles = useCallback(
    (files?: FileList | File[]) => {
      if (!files || files.length === 0) {
        return;
      }
      if (currentCount >= maxPhotos) return;
      void onFilesSelected(files);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFilesSelected, currentCount],
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
      className={cn('upload-dropzone')}
      style={{
        borderColor: isDragging ? 'var(--color-cta-primary)' : undefined,
        background: isDragging ? '#f0f9fb' : undefined,
      }}
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
      <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
        Drop your photos here
      </p>
      <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
        Drag and drop up to 10 JPG/PNG/WebP images (≤3 MB each) or click to choose files.
      </p>
      <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => inputRef.current?.click()}
          disabled={currentCount >= maxPhotos}
        >
          {buttonLabel}
        </button>
      </div>
      {currentCount > maxPhotos && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600 }}>
          <p style={{ margin: 0 }}>
            Limit reached. Choose no more than 10 photos.
          </p>
        </div>
      )}
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
