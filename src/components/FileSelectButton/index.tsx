import React, {ChangeEvent, EventHandler, ReactElement} from "react";
import "./file-select-btn.scss";
import Button from "../Button";
import Icon from "../Icon";
import classNames from "classnames";

type Props = {
    className?: string;
    accept?: string;
    onChange?: EventHandler<ChangeEvent<HTMLInputElement>>;
}

export default function FileSelectButton(props: Props): ReactElement {
    return (
        <div className={classNames("file-select-btn", props.className)}>
            <Button
                btnType="primary"
            >
                <Icon fa="fas fa-file-upload" className="mr-2" />
                <span>Select File</span>
            </Button>
            <input
                type="file"
                accept={props.accept}
                onChange={props.onChange}
            />
        </div>
    )
}