import React, {ReactElement, useCallback, useEffect, useState} from "react";
import "./url-preview.scss";
import Icon from "../Icon";
import classNames from "classnames";
import config from "../../util/config";
import {shouldBlurImage} from "../../pages/SettingView";
import SpinnerGif from "../../../static/icons/spinner.gif";
import WebTorrentViewer from "../WebTorrentViewer";

type Props = {
    url?: string;
    editable?: boolean;
    showAll?: boolean;
    onRemove?: () => void;
    className?: string;
};

type Preview = {
    link: string;
    title: string;
    description: string;
    image: string;
    mediaType: string;
    contentType: string;
    favicon: string;
}

function parseURL(url = ''): URL | null {
    try {
        return new URL(url);
    } catch (e) {
        return null;
    }
}

export default function URLPreview(props: Props): ReactElement {
    const {url, editable} = props;
    const [imageSrc, setImageSrc] = useState('');
    const [preview, setPreview] = useState<Preview|null>(null);
    const [isBlur, setBlur] = useState(shouldBlurImage());
    const [loading, setLoading] = useState(true);

    const urlParams = parseURL(url);
    const isMagnet = urlParams?.protocol === 'magnet:';


    useEffect(() => {
        (async function onURLPreviewLoad() {
            setPreview(null);
            setImageSrc('');

            if (!url) {
                return;
            }

            try {
                setLoading(true);

                if (isMagnet) {
                    return;
                }

                if (await testImage(url)) {
                    setImageSrc(url);
                    return;
                }

                const resp = await fetch(`${config.indexerAPI}/preview?link=${encodeURI(url)}`);
                const json = await resp.json();

                if (!json.payload.error) {
                    const {
                        link,
                        title = '',
                        description = '',
                        image = '',
                        mediaType = '',
                        contentType = '',
                        favicon = '',
                    } = json.payload;

                    setPreview({
                        link,
                        title,
                        description,
                        image,
                        mediaType,
                        contentType,
                        favicon,
                    });

                    return;
                }
            } catch (e) {
                setImageSrc('');
                setPreview(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [url]);

    const openImageLink = useCallback((e: any) => {
        e.stopPropagation();
        window.open(imageSrc, '_blank');
    }, [imageSrc]);

    const openLink = useCallback((e: any) => {
        if (!preview?.link) return;
        e.stopPropagation();
        window.open(preview?.link, '_blank');
    }, [preview?.link]);

    if (loading) {
        return (
            <div className={classNames("url-preview", props.className)}>
                <div className="flex flex-row items-center">
                    <Icon url={SpinnerGif} size={2.5} />
                    <small className="text-gray-500 font-semibold text-xs">Loading...</small>
                </div>
            </div>
        );
    }

    if (!imageSrc && !preview && !isMagnet) {
        return <></>;
    }

    return (
        <div
            className={classNames("url-preview", props.className, {
                'url-preview--wt': urlParams?.protocol === 'magnet:',
            })}
        >
            { urlParams?.protocol === 'magnet:' && (
                <WebTorrentViewer
                    url={urlParams.href}
                />
            )}

            { imageSrc && (
                <div
                    className={classNames("url-preview__img-container", {
                        'url-preview__img-container--showAll': props.showAll,
                        'blurred-image': !props.editable && isBlur,
                        'unblurred-image': props.editable || !isBlur,
                    })}
                >
                    <img
                        className={classNames("url-preview__img", {
                            'cursor-pointer': !props.editable,
                        })}
                        src={imageSrc}
                        onClick={!props.editable ? openImageLink : undefined}
                    />
                </div>
            ) }

            { preview && (
                <div
                    className={classNames("url-preview__link-container", {
                        'cursor-pointer': !props.editable,
                    })}
                    onClick={!props.editable ? openLink : undefined}
                >
                    {
                        preview.image && (
                            <div
                                className={classNames("url-preview__link-image", {
                                    'blurred-image': !props.editable && isBlur,
                                    'unblurred-image': props.editable || !isBlur,
                                })}
                            >
                                <img src={preview.image} />
                            </div>
                        )
                    }
                    {
                        (preview.title || preview.description)
                            ? (
                                <div className="url-preview__link-content">
                                    <div className="url-preview__link-title">{preview.title}</div>
                                    <div className="url-preview__link-desc">{preview.description}</div>
                                </div>
                            )
                            : (
                                <a className="px-4 py-2 text-light text-ellipsis overflow-hidden" href={url} target="_blank">{url}</a>
                            )
                    }

                </div>
            ) }

            { editable && (
                <Icon
                    className="url-preview__close bg-black bg-opacity-80 text-white absolute top-4 left-4 w-8 h-8"
                    fa="fas fa-times"
                    onClick={e => {
                        e.stopPropagation();
                        props.onRemove && props.onRemove();
                    }}
                />
            ) }

            { !editable && !isMagnet && !!(imageSrc || preview?.image) && (
                <Icon
                    className="url-preview__close bg-black bg-opacity-80 text-white absolute top-4 left-4 w-8 h-8"
                    fa={isBlur ? "fas fa-eye-slash" : "fas fa-eye"}
                    onClick={e => {
                        e.stopPropagation();
                        setBlur(!isBlur);
                    }}
                />
            ) }
        </div>
    );
};

function testImage(url: string) {
    return new Promise(function (resolve, reject) {
        const timer = setTimeout(function () {
            // reset .src to invalid URL so it stops previous
            // loading, but doesn't trigger new load
            img.src = "//!!!!/test.jpg";
            resolve(false);
        }, 60000);

        const img = new Image();

        img.onerror = img.onabort = function () {
            clearTimeout(timer);
            resolve(false);
        };

        img.onload = function () {
            clearTimeout(timer);
            resolve(true);
        };

        img.src = url;
    });
}