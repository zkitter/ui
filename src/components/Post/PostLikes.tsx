import classNames from "classnames";
import React, {ReactElement, useState} from "react";
import Modal, {ModalContent, ModalHeader} from "../Modal";


function Liker(props: {idx:number,  liker: any}): ReactElement {
    return (
        <li key={props.idx}>item</li>
    )
}

function LikersModal(props: {className: string, onClose: ()=> void, likers: any[]}): ReactElement {
    const {className, onClose, likers} = props
    return <Modal
        className={classNames(className)}
        onClose={onClose}
    >
        <ModalHeader>Liked By</ModalHeader>
        <ModalContent>
            <ul>
                <li>item1</li>
                <li>item2</li>
                <li>item3</li>
            </ul>
        </ModalContent>
    </Modal>;
}

export default function PostLikes(props: { className: string, likes: number }): ReactElement {
    const {className, likes} = props
    const [showingLikersModal, setShowLikersModal] = useState(false);

    return (
        <>
            <div className="flex flex-row flex-nowrap items-center text-light w-full">
                <div className={classNames(className)}>
                    <div className="hover:underline" onClick={() => setShowLikersModal(true)}>
                        <strong>{likes}{' '}</strong>like
                    </div>
                </div>
            </div>
            {showingLikersModal && (<LikersModal
                onClose={() => setShowLikersModal(false)} className={''}
                likers={[]}
            />)}
        </>
    )
}


