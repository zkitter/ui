import React, {ReactElement, useCallback, useEffect, useState} from "react";
import "./url-preview.scss";
import Icon from "../Icon";
import classNames from "classnames";
import config from "../../util/config";

type Props = {
    url?: string;
    editable?: boolean;
    showAll?: boolean;
    onRemove?: () => void;
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

export default function URLPreview(props: Props): ReactElement {
    const {url, editable} = props;
    const [imageSrc, setImageSrc] = useState('');
    const [preview, setPreview] = useState<Preview|null>(null);

    useEffect(() => {
        (async function onURLPreviewLoad() {
            if (!url) {
                setPreview(null);
                setImageSrc('');
                return;
            }

            try {
                if (await testImage(url)) {
                    setImageSrc(url);
                    return;
                } else {
                    setImageSrc('');
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

                setPreview(null);
            } catch (e) {
                setImageSrc('');
                setPreview(null);
            }


        })();
    }, [url]);

    const openImageLink = useCallback((e) => {
        e.stopPropagation();
        window.open(imageSrc, '_blank');
    }, [imageSrc]);

    const openLink = useCallback((e) => {
        if (!preview?.link) return;
        e.stopPropagation();
        window.open(preview?.link, '_blank');
    }, [preview?.link]);

    if (!imageSrc && !preview) {
        return <></>;
    }

    return (
        <div className="url-preview">

            { imageSrc && (
                <div
                    className={classNames("url-preview__img-container", {
                        'url-preview__img-container--showAll': props.showAll,
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
                    <div
                        className={classNames("url-preview__link-image", {
                        })}
                        style={{backgroundImage: `url(${preview.image})`}}
                    />
                    <div className="url-preview__link-content">
                        <div className="url-preview__link-title">{preview.title}</div>
                        <div className="url-preview__link-desc">{preview.description}</div>
                    </div>
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
        </div>
    );
}

function testImage(url: string) {
    return new Promise(function (resolve, reject) {
        const timer = setTimeout(function () {
            // reset .src to invalid URL so it stops previous
            // loading, but doesn't trigger new load
            img.src = "//!!!!/test.jpg";
            resolve(false);
        }, 5000);

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