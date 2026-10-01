import { useMutation, useQueryClient } from '@tanstack/react-query';

import { backupFileName, type BackupFile } from '@/services/backup/backupFormat';
import { createBackup, importBackup, prepareImport, serializeBackup } from '@/services/backup/backupService';
import { pickTextFile, shareTextFile } from '@/services/files/shareFiles';
import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import { useUiStore } from '@/store/uiStore';

/** Exporta el respaldo, lo comparte y registra la fecha del último respaldo. */
export function useExportBackup() {
  const { data, settings } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const backup = await createBackup(data, now);
      await shareTextFile({
        fileName: backupFileName(now),
        content: serializeBackup(backup),
        mimeType: 'application/json',
        uti: 'public.json',
        dialogTitle: 'Guardar respaldo',
      });
      // Se marca como respaldado al cerrar la hoja de compartir (no se puede saber si se guardó).
      return settings.update({ lastBackupAt: now });
    },
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.settings, updated),
  });
}

/** Elige un archivo de respaldo y lo valida (no importa todavía). */
export function usePickBackup() {
  return useMutation({
    mutationFn: async () => {
      const picked = await pickTextFile(['application/json', 'text/plain', '*/*']);
      if (picked.status === 'cancelled') return null;
      return { name: picked.name, ...prepareImport(picked.text) };
    },
  });
}

/** Reemplaza los datos por los del respaldo y refresca toda la app. */
export function useImportBackup() {
  const { data, settings } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (backup: BackupFile) => {
      await importBackup(data, backup);
      return settings.get();
    },
    onSuccess: async (restoredSettings) => {
      useUiStore.getState().setThemePreference(restoredSettings.theme);
      await queryClient.invalidateQueries();
    },
  });
}
