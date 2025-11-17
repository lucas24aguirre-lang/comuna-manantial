// src/utils/uploadImage.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';


export const uploadReclamoImage = async (file, reclamoId) => {
  try {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Formato de imagen no válido. Usa JPG, PNG o WebP.');
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('La imagen es muy grande. Máximo 5MB.');
    }

    // Crear referencia única
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageRef = ref(storage, `reclamos/${reclamoId}/${fileName}`);

    // Subir archivo
    const snapshot = await uploadBytes(storageRef, file);
    
    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      name: fileName
    };
  } catch (error) {
    console.error('Error al subir imagen:', error);
    throw error;
  }
};

// Función para eliminar imagen (cuando se borra un reclamo)
export const deleteReclamoImage = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
  }
};