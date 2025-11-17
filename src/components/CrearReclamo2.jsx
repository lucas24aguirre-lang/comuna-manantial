// src/components/CrearReclamo.jsx
import React, { useState } from 'react';
import {
  Modal, TextInput, Textarea, Select, Button, Group, 
  FileInput, Stack, Text, Alert, Image, Grid
} from '@mantine/core';
import { IconUpload, IconX, IconAlertCircle } from '@tabler/icons-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { uploadMultipleImages } from '../utils/uploadImage';
import { CATEGORIAS, CATEGORIAS_LABELS, ESTADOS } from '../types/reclamo';

export default function CrearReclamo({ opened, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: '',
    calle: '',
    numero: '',
    files: []
  });

  const handleFileChange = (files) => {
    setFormData({ ...formData, files });
    
    // Generar previews
    const previews = Array.from(files || []).map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validaciones
      if (!formData.titulo || !formData.descripcion || !formData.categoria) {
        throw new Error('Por favor completá todos los campos obligatorios.');
      }

      // Crear ID temporal para el reclamo
      const tempId = `temp_${Date.now()}`;

      // Subir imágenes si existen
      let fotosUrls = [];
      if (formData.files && formData.files.length > 0) {
        fotosUrls = await uploadMultipleImages(formData.files, tempId);
      }

      // Crear reclamo en Firestore
      const reclamoData = {
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim(),
        categoria: formData.categoria,
        ubicacion: {
          calle: formData.calle.trim(),
          numero: formData.numero.trim()
        },
        fotos: fotosUrls,
        estado: ESTADOS.PENDIENTE,
        votos: 0,
        votadoPor: [],
        usuario: {
          uid: auth.currentUser?.uid || 'anonimo',
          email: auth.currentUser?.email || 'Anónimo'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reclamos'), reclamoData);

      // Limpiar formulario
      setFormData({
        titulo: '',
        descripcion: '',
        categoria: '',
        calle: '',
        numero: '',
        files: []
      });
      setImagePreviews([]);

      // Cerrar modal y notificar éxito
      onClose();
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('Error al crear reclamo:', err);
      setError(err.message || 'Ocurrió un error al crear el reclamo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Nuevo Reclamo"
      size="lg"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing="md">
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          <TextInput
            label="Título del reclamo"
            placeholder="Ej: Bache en esquina de San Martín"
            required
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
          />

          <Textarea
            label="Descripción"
            placeholder="Describe el problema con el mayor detalle posible..."
            required
            minRows={4}
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />

          <Select
            label="Categoría"
            placeholder="Seleccioná una categoría"
            required
            data={Object.keys(CATEGORIAS).map(key => ({
              value: CATEGORIAS[key],
              label: CATEGORIAS_LABELS[CATEGORIAS[key]]
            }))}
            value={formData.categoria}
            onChange={(value) => setFormData({ ...formData, categoria: value })}
          />

          <Grid>
            <Grid.Col span={8}>
              <TextInput
                label="Calle"
                placeholder="Nombre de la calle"
                value={formData.calle}
                onChange={(e) => setFormData({ ...formData, calle: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                label="Número"
                placeholder="Nº"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              />
            </Grid.Col>
          </Grid>

          <FileInput
            label="Fotos (opcional)"
            placeholder="Subí hasta 3 fotos"
            icon={<IconUpload size={14} />}
            multiple
            accept="image/png,image/jpeg,image/jpg,image/webp"
            value={formData.files}
            onChange={handleFileChange}
            description="Máximo 3 fotos de 5MB cada una"
          />

          {imagePreviews.length > 0 && (
            <Grid>
              {imagePreviews.map((preview, index) => (
                <Grid.Col span={4} key={index}>
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    radius="md"
                    height={100}
                    fit="cover"
                  />
                </Grid.Col>
              ))}
            </Grid>
          )}

          <Group position="right" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Crear Reclamo
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}