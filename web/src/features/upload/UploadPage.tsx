import { useUpload } from '../../hooks/useUpload';
import { DropZone } from './DropZone';
import { UploadProgress } from './UploadProgress';
import { UploadHistory } from './UploadHistory';

export function UploadPage() {
  const { send, sendProgress, active, uploads } = useUpload();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Importar logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          O formato é detectado automaticamente e linhas malformadas não
          interrompem a importação — são contadas e reportadas.
        </p>
      </div>

      <DropZone
        onFile={(file) => send.mutate(file)}
        disabled={send.isPending || active?.status === 'PROCESSING'}
      />

      <UploadProgress
        sendProgress={sendProgress}
        active={active}
        isSending={send.isPending}
        error={send.error}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Histórico</h2>
        <UploadHistory uploads={uploads} />
      </section>
    </div>
  );
}
