import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_DIRECTORY = 'profile';

/**
 * Las fotos se guardan con una ruta RELATIVA a los documentos de la app
 * ("profile/avatar-123.jpg"): en iOS la ruta absoluta del contenedor cambia
 * al actualizar la app, así que una URI absoluta dejaría de funcionar.
 */
export function resolveProfilePhotoUri(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.includes('://')) return stored; // fotos guardadas antes de este cambio
  return new File(Paths.document, stored).uri;
}

/**
 * Copia la foto elegida al directorio de documentos de la app (la original
 * puede ser temporal) y devuelve su ruta relativa para guardar en el perfil.
 */
export async function saveProfilePhoto(sourceUri: string): Promise<string> {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });
  const extension = sourceUri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `avatar-${Date.now()}.${extension}`;
  await new File(sourceUri).copy(new File(directory, fileName));
  return `${PHOTO_DIRECTORY}/${fileName}`;
}

/** Borra una foto guardada por la app (ignora fotos externas o inexistentes). */
export function deleteProfilePhoto(stored: string | null | undefined): void {
  const uri = resolveProfilePhotoUri(stored);
  if (!uri || !uri.includes(`/${PHOTO_DIRECTORY}/`)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

/** Borra todas las fotos de perfil (restablecer la app). */
export function deleteAllProfilePhotos(): void {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
  if (directory.exists) directory.delete();
}
