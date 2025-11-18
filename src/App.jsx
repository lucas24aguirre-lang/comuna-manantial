// src/App.jsx
import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import BlogPage from "./components/BlogPage";
import PostPage from "./components/PostPage";
import MapPage from "./components/MapPage";
import ForoReclamosComuna from "./components/ForoReclamosComuna";
import FacebookFeed from "./components/FacebookFeed";
import "./App.css";
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Image,
  Title,
  Text,
  Box,
  ActionIcon,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconHome,
  IconMessages,
  IconMap,
  IconBrandFacebook,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

function App() {
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const location = useLocation();
  const isDark = colorScheme === 'dark';

  const NavMenuLink = ({ href, label, icon }) => {
    const isActive = location.pathname === href;
    
    return (
      <NavLink
        component={Link}
        to={href}
        label={label}
        leftSection={icon}
        onClick={toggle}
        active={isActive}
        style={{
          borderRadius: 12,
          marginBottom: 8,
          fontWeight: isActive ? 600 : 400,
          backgroundColor: isActive 
            ? (isDark ? 'rgba(117, 170, 219, 0.15)' : 'rgba(117, 170, 219, 0.1)')
            : 'transparent',
          borderLeft: isActive ? '4px solid #75AADB' : '4px solid transparent',
        }}
        styles={{
          label: {
            color: isActive ? '#75AADB' : 'inherit',
          }
        }}
      />
    );
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        navbar: {
          backgroundColor: isDark 
            ? 'var(--mantine-color-dark-7)' 
            : '#f8fafc',
          borderRight: isDark 
            ? '1px solid var(--mantine-color-dark-5)'
            : '1px solid #e2e8f0',
        }
      }}
    >
      <AppShell.Header 
        style={{
          backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : 'white',
          borderBottom: isDark 
            ? '1px solid var(--mantine-color-dark-5)'
            : '1px solid #e2e8f0',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger 
              opened={opened} 
              onClick={toggle} 
              hiddenFrom="sm" 
              size="sm"
              color="#75AADB"
            />
            
            <Group gap="sm">
              <Box
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(117, 170, 219, 0.3)',
                }}
              >
                <Image
  src={isDark ? "/logo-white.png" : "/logo.png"}
  alt="El Manantial"
  h={40}
  w={40}
  fit="contain"
/>
              </Box>
              
              <Box visibleFrom="sm">
                <Title 
                  order={2} 
                  size="h3"
                  style={{ 
                    lineHeight: 1.1,
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #75AADB 0%, #5385AD 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  El Manantial
                </Title>
                <Text 
                  size="sm" 
                  style={{ 
                    lineHeight: 1,
                    color: '#75AADB',
                    fontWeight: 500,
                  }}
                >
                  Comuna Rural
                </Text>
              </Box>
            </Group>
          </Group>

          <ActionIcon
            onClick={() =>
              setColorScheme(colorScheme === "dark" ? "light" : "dark")
            }
            variant="subtle"
            size="lg"
            aria-label="Toggle color scheme"
            color="blue"
            style={{
              transition: 'all 0.3s ease',
            }}
          >
            {colorScheme === "dark" ? (
              <IconSun stroke={1.5} size={22} />
            ) : (
              <IconMoon stroke={1.5} size={22} />
            )}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Box mb="md">
          <Text 
            size="xs" 
            fw={700} 
            tt="uppercase" 
            c="dimmed" 
            mb="sm"
            style={{ letterSpacing: 1 }}
          >
            Navegación
          </Text>
        </Box>

        <NavMenuLink
          href="/"
          label="Blog / Inicio"
          icon={<IconHome size="1.2rem" stroke={1.8} />}
        />
        <NavMenuLink
          href="/reclamos"
          label="Foro de Reclamos"
          icon={<IconMessages size="1.2rem" stroke={1.8} />}
        />
        <NavMenuLink
          href="/mapa"
          label="Mapa Interactivo"
          icon={<IconMap size="1.2rem" stroke={1.8} />}
        />
        <NavMenuLink
          href="/social"
          label="Facebook / Social"
          icon={<IconBrandFacebook size="1.2rem" stroke={1.8} />}
        />

        <Box 
          mt="auto" 
          pt="xl"
          style={{
            borderTop: isDark 
              ? '1px solid var(--mantine-color-dark-5)'
              : '1px solid #e2e8f0',
          }}
        >
          <Text size="xs" c="dimmed" ta="center">
            Comuna El Manantial
          </Text>
          <Text size="xs" c="dimmed" ta="center" fw={600}>
            Tucumán, Argentina
          </Text>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<BlogPage />} />
          <Route path="/reclamos" element={<ForoReclamosComuna />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/social" element={<FacebookFeed />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;