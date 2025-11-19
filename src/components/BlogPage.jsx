import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Title, Text, Container, SimpleGrid, Card, Image, Button, 
  Badge, Group, Box, Loader, Paper, useMantineColorScheme 
} from '@mantine/core';
import { IconMessages, IconMap } from '@tabler/icons-react';
import { client, urlFor } from '../sanity/config';

// Individual post card component for grid display
function PostCard({ post }) {
  const postDate = new Date(post.publishedAt).toLocaleDateString('es-AR');
  const imageUrl = post.mainImage 
    ? urlFor(post.mainImage).width(600).height(400).url() 
    : 'https://placeholder.co/600x400/75AADB/white?text=Imagen';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -8 }}
    >
      <Card 
        shadow="md" 
        padding="lg" 
        radius="xl"
        withBorder
        style={{
          transition: "all 0.3s ease",
          background: "var(--mantine-color-body)",
          cursor: 'pointer',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <Card.Section>
          <Box style={{ position: 'relative', overflow: 'hidden' }}>
            <Image
              src={imageUrl}
              height={220}
              alt={post.title}
              style={{ transition: 'transform 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          </Box>
        </Card.Section>

        <Box mt="md">
          <Group justify="space-between" mb="xs">
            <Badge color="blue" variant="light" radius="md" size="lg">
              {post.author}
            </Badge>
            <Text size="sm" c="dimmed" fw={500}>📅 {postDate}</Text>
          </Group>

          <Title order={3} size="h3" fw={700} style={{ lineHeight: 1.3, marginBottom: 12 }}>
            {post.title}
          </Title>

          <Text size="md" c="dimmed" lineClamp={3} style={{ lineHeight: 1.6 }}>
            {post.summary}
          </Text>

          <Button
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            mt="lg"
            fullWidth
            radius="lg"
            size="md"
            component={Link}
            to={`/post/${post.slug.current}`}
            style={{ boxShadow: '0 4px 12px rgba(117, 170, 219, 0.3)' }}
          >
            Leer más →
          </Button>
        </Box>
      </Card>
    </motion.div>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const query = `*[_type == "post"] | order(publishedAt desc) {
          _id, title, slug, author, summary, content, mainImage, publishedAt
        }`;
        const data = await client.fetch(query);
        setPosts(data);
      } catch (error) {
        console.error("Sanity fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <Container size="xl" style={{ marginTop: 40, marginBottom: 40 }}>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)'
              : 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)',
            borderRadius: 20,
            padding: 'clamp(40px, 5vw, 60px) clamp(20px, 3vw, 40px)',
            marginBottom: 40,
            color: 'white',
            textAlign: 'center',
            boxShadow: isDark 
              ? '0 8px 32px rgba(51, 65, 85, 0.5)'
              : '0 8px 32px rgba(117, 170, 219, 0.3)'
          }}
        >
          <Title 
            order={1} 
            fw={900} 
            mb="md"
            style={{ 
              fontSize: 'clamp(32px, 6vw, 56px)',
              letterSpacing: '-1px',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              lineHeight: 1.1
            }}
          >
            🏛️ Noticias de la Comuna
          </Title>
          <Text size="xl" opacity={0.95} fw={500} style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>
            Información oficial, novedades y actualizaciones del barrio
          </Text>
        </Box>
      </motion.div>

      {loading ? (
        <Paper shadow="sm" p="xl" radius="xl" style={{ textAlign: 'center', background: 'var(--mantine-color-body)' }}>
          <Loader size="xl" color="blue" mb="md" />
          <Text size="lg">Cargando noticias...</Text>
        </Paper>
      ) : posts.length === 0 ? (
        
        // Empty state fallback
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper 
            shadow="xl" 
            radius="xl" 
            p={{ base: 'xl', md: 60 }} 
            style={{ 
              textAlign: 'center',
              background: 'var(--mantine-color-body)',
              border: isDark 
                ? '2px dashed var(--mantine-color-dark-4)' 
                : '2px dashed var(--mantine-color-gray-4)'
            }}
          >
            <Title order={1} size={48} mb="md">📰</Title>
            <Title order={2} mb="md" style={{ fontSize: 'clamp(24px, 5vw, 32px)' }}>
              Próximamente
            </Title>
            <Text size="lg" c="dimmed" mb="xl">
              Estamos preparando las primeras noticias de la comuna.
            </Text>
            
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" style={{ maxWidth: 500, margin: '0 auto' }}>
              <Button
                component={Link}
                to="/reclamos"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                size="lg"
                radius="xl"
                leftSection={<IconMessages size={20} />}
                fullWidth
              >
                Ver Reclamos
              </Button>
              <Button
                component={Link}
                to="/mapa"
                variant="outline"
                color="blue"
                size="lg"
                radius="xl"
                leftSection={<IconMap size={20} />}
                fullWidth
              >
                Explorar Mapa
              </Button>
            </SimpleGrid>
          </Paper>
        </motion.div>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}