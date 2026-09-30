import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_DIRECTORY = 'profile';

/**
 * Copia la foto elegida al directorio de documentos de la app (la original
 * puede ser temporal) y devuelve la nueva URI.
 */
export async function saveProfilePhoto(sourceUri: string): Promise<string> {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });
  const extension = sourceUri.split('.').pop()?.toLowerCase() || 'jpg';
  const destination = new File(directory, `avatar-${Date.now()}.${extension}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

/** Borra una foto guardada por la app (ignora URIs externas o inexistentes). */
export function deleteProfilePhoto(uri: string | null | undefined): void {
  if (!uri || !uri.includes(`/${PHOTO_DIRECTORY}/`)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

/** Borra todas las fotos de perfil (restablecer la app). */
export function deleteAllProfilePhotos(): void {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (directory.exists) directory.delete();
}
