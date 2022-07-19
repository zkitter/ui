import React, {ReactElement, useCallback, useEffect, useRef, useState} from "react";
import classNames from "classnames";
import {addMagnetURL, getInfoHashFromMagnet, getWebtorrentClient, removeMagnetURL} from "../../util/webtorrent";
import Icon from "../Icon";
import SpinnerGif from "../../../static/icons/spinner.gif";
import {Torrent, TorrentFile} from "webtorrent";
import mime from 'mime-types';
import prettyBytes from "pretty-bytes";
import "./wt-viewer.scss";

type Props = {
    className?: string;
    url: string;
}

export default function WebTorrentViewer(props: Props): ReactElement {
    const viewer = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<{name: string; length: number; progress: number}[]>([]);
    const [selectedFile, selectFile] = useState<TorrentFile|null>(null);
    const [currentTorrent, setTorrent] = useState<Torrent|null>(null);
    const [isDownloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    const onFileClick = useCallback(async (fileIndex: number) => {
        const client = getWebtorrentClient();
        const torrent = client.get(getInfoHashFromMagnet(props.url)) || await addMagnetURL(props.url);
        setTorrent(torrent);
        const file = torrent.files[fileIndex];

        const type = mime.lookup(file.name) || '';
        const isImage = /image/.test(type);
        const isVideo = /video/.test(type);
        const isAudio = /audio/.test(type);

        const onFileReady = () => {
            setLoading(true);

            if (isImage) {
                if (file.progress === 1) {
                    if (file.progress) {
                        torrent.off('download', onFileReady);
                        setLoading(false);
                    }
                } else {
                    selectFile(file);
                }
            } else {
                if (file.progress) {
                    selectFile(file);
                    torrent.off('download', onFileReady);
                    setLoading(false);
                }
            }
        }

        const onDownload = () => {
            setFiles(torrent.files.map(({ name, length, progress }) => ({ name, length, progress })));
            setProgress(torrent.progress);
            setDownloading(torrent.progress !== 1);
        }

        if (file.progress === 1) {
            selectFile(file);
        } else {
            torrent.on('download', onFileReady);
            torrent.on('download', onDownload);
            torrent.once('done', () => {
                onFileReady();
                onDownload();
            });
        }

    }, [props.url]);

    const onDownload = useCallback(async (fileIndex: number) => {
        const client = getWebtorrentClient();
        const torrent = client.get(getInfoHashFromMagnet(props.url)) || await addMagnetURL(props.url);
        setTorrent(torrent);
        const file = torrent.files[fileIndex];

        const onDownload = () => {
            setFiles(torrent.files.map(({ name, length, progress }) => ({ name, length, progress })));
            setProgress(torrent.progress);
            setDownloading(torrent.progress !== 1);
        }

        if (torrent.progress !== 1) {
            torrent.on('download', onDownload);
            torrent.once('done', () => {
                onDownload();
            });
        }

        return new Promise((resolve) => {
            file.getBlobURL((err, url) => {
                if (err || !url) throw err
                const a = document.createElement('a')
                a.download = file.name;
                a.href = url;
                a.click();
                resolve();
            });
        });
    }, [props.url]);

    useEffect(() => {
        (async function onFileChanged () {
            if (!selectedFile || !viewer.current) {
                return;
            }

            const current = viewer.current;
            const type = mime.lookup(selectedFile.name) || '';
            const isImage = /image/.test(type);
            const isVideo = /video/.test(type);
            const isAudio = /audio/.test(type);

            if (!isImage && !isVideo && !isAudio) {
                return;
            }

            current.innerHTML = '';

            let el: any;

            if (isImage) {
                el = document.createElement('img');
            }

            if (isVideo) {
                el = document.createElement('video');
            }

            if (isAudio) {
                el = document.createElement('audio');
            }

            current.appendChild(el);
            selectedFile.renderTo(el);
            if (el.play) el.play();
        })();

    }, [selectedFile, viewer.current, props.url]);

    useEffect(() => {
        setLoading(true);

        (async function onMount() {
            const client = getWebtorrentClient();
            const t = client.get(getInfoHashFromMagnet(props.url)) || await addMagnetURL(props.url);
            setTorrent(t);
            setFiles(t.files.map(({ name, length, progress }) => ({ name, length, progress })));
            await new Promise(r => t.destroy({ destroyStore: false }, r));
            setLoading(false);
        })();
    }, [props.url]);

    useEffect(() => {
        return () => {
            const client = getWebtorrentClient();
            const t = client.get(getInfoHashFromMagnet(props.url));

            if (t) {
                t.destroy({destroyStore: false});
            }
        }
    }, [props.url]);

    return (
        <div
            className={classNames('wt-viewer', props.className)}
        >
            {loading && (
                <div className="flex flex-row items-center">
                    <Icon url={SpinnerGif} size={2.5} />
                    <small className="text-gray-500 font-semibold text-xs">Loading...</small>
                </div>
            )}
            <div className="wt-viewer__viewer" ref={viewer} />
            {!!files.length && (
                <div className="wt-viewer__files">
                    {files.map((file, i) => {
                        return (
                            <FileRow
                                key={i}
                                name={file.name}
                                length={file.length}
                                progress={file.progress}
                                onFileClick={() => onFileClick(i)}
                                onDownload={() => onDownload(i)}
                            />
                        );
                    })}
                </div>
            )}
            {
                (currentTorrent && isDownloading) && (
                    <div className="flex flex-row items-center px-4 py-2 bg-gray-200">
                        <Icon
                            className="text-gray-400 mr-4 cursor-pointer"
                            fa={classNames({
                                'fas fa-pause': isDownloading,
                            })}
                            size={.75}
                            onClick={async (e) => {
                                e.stopPropagation();
                                const client = getWebtorrentClient();
                                const torrent = client.get(getInfoHashFromMagnet(props.url));
                                if (torrent) {
                                    await new Promise(r => torrent.destroy({ destroyStore: false }, r));
                                    setDownloading(false);
                                }
                            }}
                        />
                        <div className="text-xs text-gray-400">
                            {`${prettyBytes(currentTorrent.downloadSpeed)}/s - Downloading ${currentTorrent.name}`}
                        </div>
                    </div>
                )
            }
        </div>
    )
}

function FileRow(props: {
    name: string;
    length: number;
    onFileClick: () => void;
    onDownload: () => void;
    progress: number;
}): ReactElement {
    const type = mime.lookup(props.name) || '';
    const isImage = /image/.test(type);
    const isVideo = /video/.test(type);
    const isAudio = /audio/.test(type);
    const [downloading, setDownloading] = useState(false);

    const onDownload = async () => {
        setDownloading(true);
        await props.onDownload();
        setDownloading(false);
    };

    return (
        <div
            className="wt-viewer__file"
            onClick={e => {
                e.stopPropagation();
                props.onFileClick();
            }}
        >
            <Icon
                className="wt-viewer__file__icon"
                fa={classNames({
                    'fas fa-file-image': isImage,
                    'fas fa-file-video': isVideo,
                    'fas fa-file-audio': isAudio,
                    'fas fa-file': !isImage && !isVideo && !isAudio,
                })}
                // url={props.loading ? SpinnerGif : undefined}
                size={1.5}
            />
            <div className="wt-viewer__file__name text-light mx-4">
                <div>{props.name}</div>
                <small>{`${(props.progress * 100).toFixed(0)}% - ${prettyBytes(props.length * props.progress)} / ${prettyBytes(props.length)}`}</small>
            </div>
            <Icon
                className="wt-viewer__file__download-btn"
                fa={downloading ? undefined : "fas fa-download"}
                url={downloading ? SpinnerGif : undefined}
                size={downloading ? 2 : 1.25}
                onClick={e => {
                    if (downloading) return;
                    e.stopPropagation();
                    onDownload();
                }}
            />
        </div>
    )
}