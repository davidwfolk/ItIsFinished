import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { validateAttachment, IMAGE_COMPRESSION_CONFIG, type FileValidationResult } from '@app/core';

export interface CompressedAttachment {
  uri: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Pick image from Camera or Gallery and compress down to ~350KB before upload
 */
export async function pickAndCompressImage(fromCamera: boolean = false): Promise<CompressedAttachment | null> {
  const permission = fromCamera 
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Camera/Gallery permission denied.');
  }

  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  // Perform client-side hardware compression
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      {
        resize: {
          width: IMAGE_COMPRESSION_CONFIG.maxWidth,
        },
      },
    ],
    {
      compress: IMAGE_COMPRESSION_CONFIG.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: manipulated.uri,
    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
    fileSizeBytes: manipulated.width * manipulated.height * 0.3, // Approximate compressed byte size
    mimeType: 'image/jpeg',
    width: manipulated.width,
    height: manipulated.height,
  };
}
