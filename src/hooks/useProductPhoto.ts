import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import type { LocalFile } from '../api/client';
import { useLangStore } from '../i18n';

// La photo est réduite à 1080 px et compressée en WebP sur le téléphone avant l'envoi :
// environ 80 à 150 Ko au lieu de 3 à 5 Mo pour la photo d'origine.
const MAX_SIDE = 1080;

export async function takeProductPhoto(source: 'camera' | 'library'): Promise<LocalFile | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    const en = useLangStore.getState().lang === 'en';
    Alert.alert(
      source === 'camera' ? (en ? 'Camera disabled' : 'Appareil photo désactivé') : en ? 'Photos disabled' : 'Photos désactivées',
      en ? 'Allow access in the phone settings to add your products.' : 'Autorisez l’accès dans les réglages du téléphone pour ajouter vos produits.',
    );
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.WEBP, compress: 0.7 });
  return { uri: saved.uri, name: `produit-${Date.now()}.webp`, type: 'image/webp' };
}
