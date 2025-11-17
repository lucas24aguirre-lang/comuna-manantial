import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Title, Text, Container, SimpleGrid, Card, Image, Button, 
  Badge, Group, Box, Loader 
} from '@mantine/core';
import { client, urlFor } from '../sanity/config';

function PostCard({ post }) {
  const postDate = new Date(post.publishedAt).toLocaleDateString('es-AR');
  const imageUrl = post.mainImage 
    ? urlFor(post.mainImage).width(600).height(400).url() 
    : 'https://placeholder.co/600x400/75AADB/white?text=Imagen';

  return (
    <Card 
      shadow="sm" 
      padding="lg" 
      radius="lg" 
      withBorder
      style={{
        transition: "0.2s ease",
        background: "var(--mantine-color-body)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.015)";
        e.currentTarget.style.boxShadow = "0px 6px 18px rgba(0,0,0,0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
      }}
    >
      <Card.Section>
        <Image
          src={imageUrl}
          height={180}
          alt={post.title}
          radius="lg"
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        />
      </Card.Section>

      <Box mt="md">
        <Title order={3} size="h4" fw={600} style={{ lineHeight: "1.2" }}>
          {post.title}
        </Title>

        <Group justify="space-between" mt={10}>
          <Badge color="blue" variant="light" radius="md">
            {post.author}
          </Badge>
          <Text size="xs" c="dimmed">
            {postDate}
          </Text>
        </Group>

        <Text size="sm" mt="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
          {post.summary}
        </Text>

        <Button
          variant="light"
          color="blue"
          mt="md"
          fullWidth
          radius="lg"
          size="md"
          component={Link}
          to={`/post/${post.slug.current}`}
          style={{ fontWeight: 600 }}
        >
          Leer más
        </Button>
      </Box>
    </Card>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const query = `*[_type == "post"] | order(publishedAt desc) {
          _id,
          title,
          slug,
          author,
          summary,
          content,
          mainImage,
          publishedAt
        }`;
        
        const data = await client.fetch(query);
        setPosts(data);
        console.log('✅ Posts cargados desde Sanity:', data.length);
      } catch (error) {
        console.error("❌ Error al obtener los posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <Container 
      size="xl"
      style={{ 
        marginTop: 40,
        marginBottom: 40,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Title order={1} size={42} fw={800}>
          Noticias de la Comuna
        </Title>
        <Text size="lg" c="dimmed" mt={10}>
          Información oficial, novedades y actualizaciones del barrio
        </Text>
      </div>

      {loading ? (
        <Group justify="center" mt="xl">
          <Loader size="lg" color="blue" />
          <Text>Cargando noticias...</Text>
        </Group>
      ) : posts.length === 0 ? (
        <Text ta="center" c="dimmed" mt="xl">
          No hay noticias publicadas por el momento.
        </Text>
      ) : (
        <SimpleGrid 
          cols={{ base: 1, sm: 2, lg: 3 }}
          spacing="xl"
        >
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}