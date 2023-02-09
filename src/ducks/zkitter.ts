import { Zkitter } from 'zkitter-js';

export enum ActionType {}

export type Action<payload> = {
  type: ActionType;
  payload?: payload;
  meta?: any;
  error?: boolean;
};

export type State = {};

const initialState: State = {};

export const initZkitter = () => async () => {
  const node = await Zkitter.initialize({
    arbitrumProvider: 'wss://arb-mainnet.g.alchemy.com/v2/P1rD_tiddTEVdzRdlEqIrWBqw9e8yXFY',
  });

  node.on('Users.ArbitrumSynced', console.log.bind(console));
  node.on('Group.GroupSynced', console.log.bind(console));
  node.on('Zkitter.NewMessageCreated', console.log.bind(console));
  // await node.syncUsers();
  // await node.queryHistory();
  console.log(await node.getPosts());
  console.log(await node.getUsers(5));
};

export default function zkitter(state = initialState, action: Action<any>) {
  switch (action.type) {
    default:
      return state;
  }
}
