import 'leaflet/dist/leaflet.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import { BrowserRouter } from "react-router-dom";
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

const celesteArgentina = [
  '#EDF5FC',
  '#DAE8F6',
  '#C0D8F0',
  '#A3C7EA',
  '#8ABAE3',
  '#79B0DE',
  '#75AADB',
  '#6296C4',
  '#5385AD',
  '#437498'
];

const theme = createTheme({
  colors: {
    blue: celesteArgentina,
  },
  primaryColor: 'blue',
  primaryShade: 6,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
)