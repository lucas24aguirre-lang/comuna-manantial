import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

/**
 * Sube una imagen al storage de Firebase asociada a un reclamo
 * @param {File} file - Archivo a subir
 * @param {string} reclamoId - ID del reclamo para organizar la carpeta
 */
export const uploadReclamoImage = async (file, reclamoId) => {
  try {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) throw new Error('Formato no válido (JPG, PNG, WebP).');

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) throw new Error('Imagen excede 5MB.');

    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageRef = ref(storage, `reclamos/${reclamoId}/${fileName}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      name: fileName
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Elimina una imagen del storage
 * @param {string} imagePath - Ruta relativa en Firebase Storage
 */
export const deleteReclamoImage = async (imagePath) => {
  if (!imagePath) return;
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Delete image error:', error);
  }
};