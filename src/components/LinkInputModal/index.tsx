import React, {ChangeEvent, KeyboardEvent, ReactElement, useCallback, useState} from "react";
import Modal, {ModalContent, ModalFooter, ModalHeader} from "../Modal";
import classNames from "classnames";
import Input from "../Input";
import Icon from "../Icon";
import Button from "../Button";
import URLPreview from "../URLPreview";

type Props = {
    className?: string;
    onClose: () => void;
    onAccept: (url: string) => void;
}

export default function LinkInputModal(props: Props): ReactElement {
    const [err, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [link, setLink] = useState('');


    const onLinkEntered = useCallback(async () => {
        setError('');
        setPreviewUrl(link);
    }, [link]);

    const onLinkChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLink(val);
    }

    const onKeyPress = useCallback(async (e: KeyboardEvent<HTMLInputElement>) => {
        if (validateLink(link) && e.key === 'Enter') {
            onLinkEntered();
        }
    }, [onLinkEntered, link]);

    const reset = () => {
        setPreviewUrl('');
        setLink('');
        setError('');
    }
    return (
        <Modal
            className={classNames('w-148 file-upload-modal', props.className)}
            onClose={props.onClose}
        >
            <ModalHeader onClose={!previewUrl ? props.onClose : undefined}>
                Add a Link
            </ModalHeader>
            <ModalContent>
                <div className="flex flex-col items-center justify-center p-4">
                    <div className="relative w-full mb-4">
                        <Input
                            className="border"
                            label="Enter link"
                            onChange={onLinkChange}
                            value={link}
                            onKeyPress={onKeyPress}
                            placeholder="http(s):// or magnet://..."
                        >
                            { validateLink(link) && (
                                <Icon
                                    className="mx-4 text-blue-300 hover:text-blue-400"
                                    fa="fas fa-binoculars"
                                    onClick={onLinkEntered}
                                />
                            )}
                        </Input>
                    </div>
                    {
                        previewUrl && (
                            <URLPreview className="w-full" url={previewUrl} />
                        )
                    }
                </div>
                { err ? <div className="text-xs text-center text-red-500 mb-4">{err}</div> : null }
            </ModalContent>
            {
                previewUrl && (
                    <ModalFooter>
                        <Button
                            btnType="secondary"
                            onClick={reset}
                        >
                            <Icon fa="fas fa-times" />
                        </Button>
                        <Button
                            btnType="primary"
                            className="ml-2"
                            onClick={() => props.onAccept(link)}
                        >
                            <Icon
                                fa="fas fa-check"
                            />
                        </Button>
                    </ModalFooter>
                )
            }
        </Modal>
    );
}

const validateLink = (link: string): boolean => {
    try {
        new URL(link);
        return true;
    } catch (e) {
        return false;
    }
}