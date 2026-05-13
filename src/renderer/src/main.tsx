import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { installMockApi } from './mock/api';
import './styles.css';

if (new URLSearchParams(window.location.search).get('mock') === '1') {
  installMockApi();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
