import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';
import Post from './index';
import { MessageType, Post as PostMessage, PostMessageSubType } from 'zkitter-js';
import { ducks, store } from '~/testUtils';

// FIXME transform  pretty-bytes (jest config?)
describe('<Post>', () => {
  const root = document.createElement('div');
  const post = new PostMessage({
    type: MessageType.Post,
    subtype: PostMessageSubType.Default,
    payload: {
      content: 'hello',
    },
  });
  const json = post.toJSON();

  it('should mount', async () => {
    act(() => {
      ReactDOM.render(
        <Provider store={store}>
          <Post messageId={json.messageId} />
        </Provider>,
        root
      );
    });

    expect(root.innerHTML).toBeTruthy();
  });

  it('should update', async () => {
    store.dispatch(ducks.posts.setPost(post));
    expect(root.textContent).toBe('Anonymous•a few secondshello000');
  });
});
