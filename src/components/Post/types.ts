import {MouseEventHandler} from "react";
import {Post as PostMessage} from "../../util/message";

export type Props = {
    messageId: string;
    className?: string;
    onClick?: MouseEventHandler;
    expand?: boolean;
    isParent?: boolean;
    onSuccessPost?: (post: PostMessage) => void;
};