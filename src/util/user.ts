import {User} from "../ducks/users";

export const ellipsify = (str: string, start = 6, end = 4) => {
    return str.slice(0, start) + '...' + str.slice(-end);
}

export const getName = (user?: User | null, start = 6, end = 4): string => {
    if (!user) return '';
    if (!user.address) return '';
    if (user.name) return user.name;
    if (user.ens) return user.ens;
    return ellipsify(user.address, start, end);
}

export const getUsername = (user?: User | null): string => {
    if (!user) return '';
    if (!user.address) return '';
    if (user.ens) return user.ens;
    return user.address;
}

export const getHandle = (user?: User | null, start = 6, end = 4): string => {
    if (!user) return '';
    if (!user.address) return '';
    if (user.ens) return user.ens;
    return ellipsify(user.address, start, end);
}