import classNames from "classnames";
import React, {ReactElement} from "react";

export default function PostLikes(props: { className: string, likes: number }): ReactElement {
    const {className, likes} = props

    return (
        <div className="flex flex-row flex-nowrap items-center text-light w-full">
            <div className={classNames(className)}>{likes} like</div>
        </div>
    )
}
