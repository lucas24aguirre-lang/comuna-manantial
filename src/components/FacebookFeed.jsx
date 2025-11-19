import React from 'react';
import { Title, Text, Container, Box, Paper } from '@mantine/core';

export default function FacebookFeed() {
  return (
    <Container size="xl" mb="xl" mt="xl"> 
      <Box mb="xl" style={{ textAlign: 'center' }}>
        <Title order={1} mb="sm">
          Nuestra Actividad en Redes
        </Title>
        
        <Text c="dimmed">
          Seguí el día a día de la comuna y las últimas 
          novedades directamente desde nuestra página oficial de Facebook.
        </Text>
      </Box>
      
      {/* Integration with SociableKit iframe for Facebook Page feed */}
      <Paper 
        shadow="md" 
        radius="lg" 
        p="xs" 
        withBorder 
        style={{ overflow: 'hidden', background: 'white' }}
      >
        <iframe 
          src="https://widgets.sociablekit.com/facebook-page-posts/iframe/25623903" 
          frameBorder="0" 
          width="100%" 
          height="1000" 
          style={{ border: 'none', maxWidth: '100%' }}
          title="Facebook Feed Comuna"
        ></iframe>
      </Paper>
      
    </Container>
  );
}