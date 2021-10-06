import React, {ReactElement, useCallback, useEffect, useState} from "react";
import "./url-preview.scss";
import Icon from "../Icon";
import classNames from "classnames";

type Props = {
    url?: string;
    editable?: boolean;
    showAll?: boolean;
    onRemove?: () => void;
};

export default function URLPreview(props: Props): ReactElement {
    const {url, editable} = props;
    const [imageSrc, setImageSrc] = useState('');

    useEffect(() => {
        (async function onURLPreviewLoad() {
            if (!url) return;

            try {
                if (await testImage(url)) {
                    setImageSrc(url);
                }
            } catch (e) {
                setImageSrc('');
            }


        })();
    }, [props.url]);

    const openImageLink = useCallback((e) => {
        e.stopPropagation();
        window.open(imageSrc, '_blank');
    }, [imageSrc]);

    if (!imageSrc) {
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
            reject("timeout");
        }, 5000);

        const img = new Image();

        img.onerror = img.onabort = function () {
            clearTimeout(timer);
            reject("error");
        };

        img.onload = function () {
            clearTimeout(timer);
            resolve("success");
        };

        img.src = url;
    });
}