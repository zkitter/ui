import React from 'react';
import App from './index';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import sinon from 'sinon';
import { store } from '../../util/testUtils';

// FIXME transform of pretty-bytes (jest config?)

// @ts-ignore
navigator.serviceWorker = {
  addEventListener: sinon.stub(),
};

test('<App> - should mount', async () => {
  const root = document.getElementById('root');

  ReactDOM.render(
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>,
    root
  );

  expect(root!.innerHTML).toBeTruthy();
});
