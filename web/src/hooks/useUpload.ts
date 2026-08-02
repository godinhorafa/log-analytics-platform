import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api/client';
import { listUploads } from '../api/endpoints';
import { formatNumber } from '../lib/format';

/**
 * Upload em duas fases, honesto com o comportamento medido do backend:
 * o POST /uploads consome o arquivo em streaming com backpressure e só
 * responde ao FINAL do processamento. Por isso o acompanhamento vivo NÃO
 * espera o POST: ao iniciar o envio, começa a pollar GET /uploads — o
 * registro aparece como PROCESSING com parsedLines/errorLines subindo.
 */
export function useUpload() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sendProgress, setSendProgress] = useState(0);
  // separados de propósito: o resumo do arquivo persiste após concluir,
  // enquanto o polling de 1s só roda durante o processamento
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const send = useMutation({
    mutationFn: async (file: File) => {
      setSendProgress(0);
      setCurrentFile(file.name);
      setPolling(true); // observa ANTES do POST responder
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ uploadId: string }>('/uploads', form, {
        timeout: 0, // uploads grandes: a conexão dura o processamento inteiro
        onUploadProgress: (e) =>
          setSendProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
      return data.uploadId;
    },
    onError: () => setPolling(false),
  });

  const uploads = useQuery({
    queryKey: ['uploads'],
    queryFn: listUploads,
    refetchInterval: polling ? 1_000 : false,
  });

  // lista vem ordenada por startedAt DESC → find pega o mais recente do nome
  const active = currentFile
    ? uploads.data?.find((u) => u.filename === currentFile)
    : undefined;

  // Concluiu/falhou → para o polling, notifica e invalida dashboard/tabela
  // (num useEffect: efeitos nunca no corpo do render)
  useEffect(() => {
    if (active?.status === 'COMPLETED') {
      setPolling(false);
      toast.success(
        `${active.filename}: ${formatNumber(active.parsedLines)} linhas importadas`,
        {
          description:
            active.errorLines > 0
              ? `${formatNumber(active.errorLines)} linhas malformadas foram contadas e ignoradas`
              : undefined,
          action: {
            label: 'Ver dashboard',
            onClick: () => void navigate('/dashboard'),
          },
        },
      );
      void queryClient.invalidateQueries({ queryKey: ['aggregations'] });
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
    } else if (active?.status === 'FAILED') {
      setPolling(false);
      toast.error(`Falha ao processar ${active.filename}`, {
        description: active.errorMessage ?? undefined,
      });
    }
  }, [active, queryClient, navigate]);

  return { send, sendProgress, active, uploads };
}
