import React, {ReactElement, ReactNode, useEffect} from "react";
import {getUser, useUser} from "../../ducks/users";
import {useDispatch} from "react-redux";
import {getName} from "../../util/user";
import Icon from "../Icon";
// import TwitterPaper from "../../../static/icons/twitter-paper.png";
// import TwitterBronze from "../../../static/icons/twitter-bronze.png";
// import TwitterSilver from "../../../static/icons/twitter-silver.png";
// import TwitterGold from "../../../static/icons/twitter-gold.png";
import Popoverable from "../Popoverable";
import {getGroupName} from "../../util/interrep";
import "./nickname.scss";

type Props = {
    className?: string;
    address?: string;
    interepProvider?: string;
    interepGroup?: string;
};

export default function Nickname(props: Props): ReactElement {
    const { address, interepProvider, interepGroup, className = '' } = props;
    const user = useUser(address);
    const dispatch = useDispatch();

    const badges: ReactNode[] = [];

    useEffect(() => {
        if (!user && address) {
            dispatch(getUser(address));
        }
    }, [user, address]);

    if (user) {
        return (
            <div className={`flex flex-row flex-nowrap items-center nickname ${className}`}>
                <p className="text-ellipsis overflow-hidden nickname__text">
                    {getName(user)}
                </p>
            </div>
        )
    }



    if (interepProvider && interepGroup) {
    // TODO: badges is for wallet users only
    //     if (/twitter/i.test(interepProvider)) {
    //         if (/not_sufficient/i.test(interepGroup)) {
    //             badges.push(
    //                 <Badge
    //                     key={interepProvider + '_' + interepGroup}
    //                     label="<500 Twitter followers"
    //                     url={TwitterPaper}
    //                 />
    //             );
    //         }
    //
    //         if (/bronze/i.test(interepGroup)) {
    //             badges.push(
    //                 <Badge
    //                     key={interepProvider + '_' + interepGroup}
    //                     label="500+ Twitter followers"
    //                     url={TwitterBronze}
    //                 />
    //             );
    //         }
    //
    //         if (/silver/i.test(interepGroup)) {
    //             badges.push(
    //                 <Badge
    //                     key={interepProvider + '_' + interepGroup}
    //                     label="2000+ Twitter followers"
    //                     url={TwitterSilver}
    //                 />
    //             );
    //         }
    //
    //         if (/gold/i.test(interepGroup)) {
    //             badges.push(
    //                 <Badge
    //                     key={interepProvider + '_' + interepGroup}
    //                     label="7000+ Twitter followers"
    //                     url={TwitterGold}
    //                 />
    //             );
    //         }
    //     }

        return (
            <div className={`flex flex-row flex-nowrap items-center nickname ${className}`}>
                <p className="text-ellipsis overflow-hidden nickname__text">
                    {getGroupName(interepProvider, interepGroup)}
                </p>
                <div className="flex flex-row flex-nowrap items-center ml-2">
                    { badges }
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-row flex-nowrap items-center nickname ${className}`}>
            Anonymous
        </div>
    );
}

function Badge(props: { url: string; label: string }): ReactElement {
    return (
        <Popoverable label={props.label}>
            <Icon
                className="shadow rounded-full"
                url={props.url}
                size={1}
            />
        </Popoverable>

    )
}