import * as ImagePicker from 'expo-image-picker';

import { saveProfilePhoto } from '@/services/files/profilePhoto';
import { withoutAutoLock } from '@/store/sessionStore';

export type PickPhotoResult = { status: 'picked'; uri: string } | { status: 'cancelled' } | { status: 'denied' };

/** Abre la galería, recorta en cuadrado y copia la foto a los documentos de la app. */
export async function pickProfilePhoto(): Promise<PickPhotoResult> {
  return withoutAutoLock(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return { status: 'cancelled' };
    return { status: 'picked', uri: await saveProfilePhoto(asset.uri) };
  });
}
