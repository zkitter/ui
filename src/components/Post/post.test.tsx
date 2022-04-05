import React from "react";
import ReactDOM from "react-dom";
import {act} from "react-dom/test-utils";
import {Provider} from "react-redux";
import Post from "./index";
import {Post as PostMessage} from "../../util/message";
import {dispatchSpy, ducks, gunStub, store} from "../../util/testUtils";
import {MessageType, PostMessageSubType} from "../../util/message";

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

    it ('should mount', async () => {
        act(() => {
            ReactDOM.render(
                <Provider store={store}>
                    <Post messageId={json.messageId} />
                </Provider>,
                root,
            )
        });

        expect(root.innerHTML).toBeTruthy();
    });

    it ('should update', async () => {
        store.dispatch(ducks.posts.setPost(post))
        expect(root.textContent).toBe('Anonymous•a few secondshello000');
    });
});
