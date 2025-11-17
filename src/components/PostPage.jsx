import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Container, Title, Text, Image, Paper, Button, Alert, Badge, Group, Loader 
} from '@mantine/core';
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { client, urlFor } from '../sanity/config';

export default function PostPage() {
  const { id } = useParams(); 
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      try {
        const query = `*[_type == "post" && slug.current == $slug][0] {
          _id,
          title,
          slug,
          author,
          summary,
          content,
          mainImage,
          publishedAt
        }`;
        
        const data = await client.fetch(query, { slug: id });
        
        if (data) {
          setPost(data);
        } else {
          setError("No se encontró el artículo que estás buscando.");
        }
      } catch (err) {
        console.error("Error al obtener el post:", err);
        setError("Ocurrió un error al cargar el artículo.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <Container size="sm" mt="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" mt="xl">
        <Alert 
          icon={<IconAlertCircle size="1rem" />} 
          title="Error" 
          color="red"
          variant="outline"
        >
          {error}
          <Button component={Link} to="/" variant="light" color="red" mt="md">
            Volver al Blog
          </Button>
        </Alert>
      </Container>
    );
  }

  const imageUrl = post.mainImage 
    ? urlFor(post.mainImage).width(800).height(400).url() 
    : null;
  const postDate = new Date(post.publishedAt).toLocaleDateString('es-AR');

  return (
    <Container size="sm" style={{ maxWidth: 780, paddingTop: 20 }}>
      <Button
        component={Link}
        to="/"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
        radius="lg"
      >
        Volver
      </Button>

      <Paper withBorder shadow="sm" radius="lg" p="xl">
        <Title order={1} ta="center" mb={10} style={{ fontSize: 36, fontWeight: 800 }}>
          {post.title}
        </Title>

        <Group justify="center" mb="lg">
          <Badge radius="sm" variant="light" color="blue">
            {post.author}
          </Badge>
          <Text size="sm" c="dimmed">
            {postDate}
          </Text>
        </Group>

        {imageUrl && (
          <Image
            src={imageUrl}
            alt={post.title}
            radius="md"
            mb="xl"
            style={{ maxHeight: 380, objectFit: "cover" }}
          />
        )}

        <Text style={{ whiteSpace: "pre-wrap", fontSize: 18, lineHeight: 1.7 }}>
          {post.content}
        </Text>
      </Paper>
    </Container>
  );
}