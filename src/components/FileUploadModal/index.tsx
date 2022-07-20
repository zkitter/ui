import React, {
    KeyboardEvent, ChangeEvent, ReactElement,
    useCallback, useEffect, useRef, useState,
} from "react";
import Modal, {ModalContent, ModalFooter, ModalHeader} from "../Modal";
import Button from "../Button";
import Icon from "../Icon";
import classNames from "classnames";
import "./file-upload-modal.scss";
import FileSelectButton from "../FileSelectButton";
import Input from "../Input";
import config from "../../util/config";
import URLPreview from "../URLPreview";
import {useDispatch} from "react-redux";
import {ipfsUploadOne} from "../../util/upload";

type Props = {
    className?: string;
    onClose: () => void;
    onAccept: (url: string) => void;
    mustLinkBeImage?: boolean;
    skipLinkPreview?: boolean;
}

const ONE_MB = 1048576;
const maxFileSize = ONE_MB * 5;

export default function FileUploadModal(props: Props): ReactElement {
    const dispatch = useDispatch();
    const drop = useRef<HTMLDivElement>(null);
    const [err, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [link, setLink] = useState('');
    const [file, setFile] = useState<File|null>(null);
    const [isUploading, setUploading] = useState(false);

    const handleDrag = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!e.dataTransfer) return;

        const {files} = e.dataTransfer;
        const file = files[0];

        onFileChange(file);
    }

    const onFileChange = async (file: File) => {
        setError('');

        if (!(/(^image)(\/)[a-zA-Z0-9_]*/).test(file.type)) {
            setError('invalid file type');
            return;
        }

        const url = URL.createObjectURL(file);

        const isImageValid = await validateImage(url);

        if (!isImageValid) {
            setError('image cannot be previewed');
            return;
        }

        setFile(file);
        setLink('');
        setPreviewUrl(url);
    }

    const onLinkEntered = useCallback(async () => {
        setError('');

        if (props.mustLinkBeImage) {
            const isImageValid = await validateImage(link);

            if (!isImageValid) {
                setError('image cannot be previewed');
                return;
            }
        }

        if (props.skipLinkPreview) {
            props.onAccept(link);
        } else {
            setFile(null);
            setPreviewUrl(link);
        }
    }, [link]);

    const onLinkChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLink(val);
    }

    const onKeyPress = useCallback(async (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onLinkEntered();
        }
    }, [onLinkEntered]);

    const reset = () => {
        setPreviewUrl('');
        setLink('');
        setError('');
    }

    const upload = useCallback(async () => {
        setUploading(true);

        try {
            if (file) {
                if (file.size > maxFileSize) throw new Error('cannot exceed 5MB');
                const json: any = await dispatch(ipfsUploadOne(file));

                if (!json.error) {
                    const {url} = json.payload;
                    props.onAccept(url);
                } else {
                    setError(json.payload);
                }
            } else if (link) {
                props.onAccept(link);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setUploading(false);
        }

    }, [file, link]);

    useEffect(() => {
        if (!drop.current) {
            return;
        }

        drop.current.addEventListener('dragover', handleDrag);
        drop.current.addEventListener('drop', handleDrop);

        return () => {
            if (drop.current) {
                drop.current.removeEventListener('dragover', handleDrag);
                drop.current.removeEventListener('drop', handleDrop);
            }
        }
    }, [drop.current]);


    return (
        <Modal
            className={classNames('w-148 file-upload-modal', props.className)}
            onClose={props.onClose}
        >
            <ModalHeader onClose={!previewUrl ? props.onClose : undefined}>
                Add a File
            </ModalHeader>
            <ModalContent>
                {
                    previewUrl
                        ? (
                            <div className="file-upload-modal__img-preview">
                                <img
                                    src={previewUrl}
                                />
                            </div>
                        )
                        : (
                            <div className="flex flex-col items-center justify-center p-4">
                                <div
                                    ref={drop}
                                    className="file-upload-modal__dd mt-4"
                                >
                                    <div>Drag & Drop</div>
                                    <FileSelectButton
                                        className="my-2"
                                        accept="image/*"
                                        onChange={e => e.target.files && onFileChange(e.target.files[0])}
                                    />
                                    <small>Maximum image size: 5MB</small>
                                </div>
                                <div className="m-4 font-semibold">or</div>
                                <div className="relative w-full mb-4">
                                    <Input
                                        className="border"
                                        label="Paste a Link"
                                        onChange={onLinkChange}
                                        onKeyPress={onKeyPress}
                                    >
                                        { validateLink(link) && (
                                            <Icon
                                                className="mx-4 text-blue-300 hover:text-blue-400"
                                                fa="fas fa-arrow-right"
                                                onClick={onLinkEntered}
                                            />
                                        )}
                                    </Input>
                                </div>
                            </div>
                        )
                }
                { err ? <div className="text-xs text-center text-red-500 mb-4">{err}</div> : null }
            </ModalContent>
            {
                previewUrl && (
                    <ModalFooter>
                        <Button
                            btnType="secondary"
                            onClick={reset}
                            disabled={isUploading}
                        >
                            <Icon fa="fas fa-times" />
                        </Button>
                        <Button
                            btnType="primary"
                            className="ml-2"
                            loading={isUploading}
                            onClick={upload}
                        >
                            <Icon
                                fa="fas fa-check"
                            />
                        </Button>
                    </ModalFooter>
                )
            }
        </Modal>
    )
}

const validateLink = (link: string): boolean => {
    try {
        new URL(link);
        return true;
    } catch (e) {
        return false;
    }
}

const validateImage = async (link: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
       const img = new Image();
       img.onload = () => resolve(true);
       img.onerror = () => resolve(false);
       img.src = link;
    });
}