// src/App.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
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

  const NavMenuLink = ({ href, label, icon }) => (
    <NavLink
      component={Link}
      to={href}
      label={label}
      leftSection={icon}
      onClick={toggle}
    />
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Image
              src="/logo.png"
              alt="Logo"
              h={40}
              fallbackSrc={
                <Title order={3} style={{ marginLeft: 8 }}>
                  Comuna El Manantial
                </Title>
              }
            />
          </Group>

          <ActionIcon
            onClick={() =>
              setColorScheme(colorScheme === "dark" ? "light" : "dark")
            }
            variant="default"
            size="lg"
            aria-label="Toggle color scheme"
          >
            {colorScheme === "dark" ? (
              <IconSun stroke={1.5} />
            ) : (
              <IconMoon stroke={1.5} />
            )}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavMenuLink
          href="/"
          label="Blog / Inicio"
          icon={<IconHome size="1rem" />}
        />
        <NavMenuLink
          href="/reclamos"
          label="Foro de Reclamos"
          icon={<IconMessages size="1rem" />}
        />
        <NavMenuLink
          href="/mapa"
          label="Mapa Interactivo"
          icon={<IconMap size="1rem" />}
        />
        <NavMenuLink
          href="/social"
          label="Facebook / Social"
          icon={<IconBrandFacebook size="1rem" />}
        />
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