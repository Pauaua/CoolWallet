import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { withoutAutoLock } from '@/store/sessionStore';

type ShareOptions = {
  fileName: string;
  content: string;
  mimeType: string;
  /** Tipo de archivo en iOS (UTI). */
  uti: string;
  dialogTitle: string;
};

/**
 * Escribe el archivo en la caché de la app y abre la hoja nativa de compartir
 * (Drive, correo, WhatsApp, Archivos…). No usa la red por sí misma.
 */
export async function shareTextFile({ fileName, content, mimeType, uti, dialogTitle }: ShareOptions): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  await withoutAutoLock(() => Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle }));
}

export type PickedText = { status: 'picked'; name: string; text: string } | { status: 'cancelled' };

/** Abre el selector de archivos y lee el elegido como texto. */
export async function pickTextFile(types: string[]): Promise<PickedText> {
  return withoutAutoLock(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return { status: 'cancelled' };
    return { status: 'picked', name: asset.name, text: await new File(asset.uri).text() };
  });
}
