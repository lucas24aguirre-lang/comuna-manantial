// src/components/FacebookFeed.jsx
import React from 'react';
import { Paper, Title, Text, Container } from '@mantine/core';

const FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=61551854110531&locale=es_LA";
const FACEBOOK_PAGE_NAME = "Comuna El Manantial";

export default function FacebookFeed() {
  const encodedUrl = encodeURIComponent(FACEBOOK_PAGE_URL);
  
  return (
    <Container size="md"> 
      <Title order={1} ta="center" mb="md">
        Nuestra Actividad en Redes
      </Title>
      
      <Text ta="center" c="dimmed" mb="xl">
        Seguí el día a día de la comuna y las últimas 
        novedades directamente desde nuestra página oficial de Facebook.
      </Text>
      
      <Paper 
        withBorder 
        shadow="md" 
        radius="md" 
        p="lg"
        style={{
          maxWidth: 500,
          margin: '0 auto'
        }}
      >
        <Title order={3} mb="md">
          Seguinos en {FACEBOOK_PAGE_NAME}
        </Title>
        
        <iframe 
          src={`https://www.facebook.com/plugins/page.php?href=${encodedUrl}&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`}
          width="100%" 
          height="600" 
          style={{ border: 'none', overflow: 'hidden' }}
          scrolling="no" 
          frameBorder="0" 
          allowFullScreen={true} 
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />
      </Paper>
    </Container>
  );
}