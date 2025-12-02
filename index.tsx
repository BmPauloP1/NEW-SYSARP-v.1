
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  /* 
    React.StrictMode foi removido intencionalmente.
    O Leaflet (biblioteca de mapas) possui problemas conhecidos com o StrictMode do React 18,
    causando erros como "Cannot read properties of undefined (reading '_leaflet_pos')"
    devido ao ciclo duplo de montagem/desmontagem em desenvolvimento.
  */
  <App />
);
