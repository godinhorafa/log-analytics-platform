import { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';

const ACCEPTED = ['.log', '.jsonl', '.txt', '.json'];

export function DropZone({
  onFile,
  disabled = false,
}: {
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      data-testid="dropzone"
      aria-disabled={disabled}
      className={`flex h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
        disabled
          ? 'border-border bg-muted cursor-not-allowed opacity-60'
          : dragging
            ? 'border-primary bg-primary/5 cursor-pointer'
            : 'border-border bg-background hover:border-muted-foreground/50 cursor-pointer'
      }`}
    >
      <UploadCloud aria-hidden className="text-muted-foreground size-8" />
      <span className="text-muted-foreground">
        Arraste um arquivo de log ou{' '}
        <span className="text-primary font-medium underline">selecione</span>
      </span>
      <span className="text-muted-foreground/70 text-xs">
        Formatos: JSON Lines, Nginx/Apache, Syslog · detecção automática · até 2GB
      </span>
      <input
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ''; // permite re-enviar o mesmo arquivo
        }}
      />
    </label>
  );
}
