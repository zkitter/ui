import './util/gun';
import 'isomorphic-fetch';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import App from './pages/App';
import store from './store/configureAppStore';
import { createServiceWorker } from './util/sw';

(async () => {
  if ('serviceWorker' in navigator) {
    await createServiceWorker();
  }

  ReactDOM.render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>,
    document.getElementById('root')
  );
})();

if ((module as any).hot) {
  (module as any).hot.accept();
}
