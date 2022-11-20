const { Connection, PublicKey } = require('@solana/web3.js');
const { deserializeUnchecked } = require('borsh');
const extendBorsh = require('./borsh');
const bs58 = require('bs58');
const BN = require('bn.js');

extendBorsh();

// !!!!! due to limitation of public node, better to use own node
const solanaNodeProvider = 'https://api.mainnet-beta.solana.com';
const meProgramV2 = 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K'; // Magic Eden v2 program
const targetWallet = ''; // wallet in string/base58 format
const operationType = '1'; // 1 - listing type

const connection = new Connection(solanaNodeProvider);

connection
  .getProgramAccounts(new PublicKey(meProgramV2), {
    commitment: 'confirmed',
    encoding: 'base64',
    dataSlice: {
      offset:
        8 + // type (1 - listed, 200 - expired offer, ... duno about others)
        32 + // need to check ... duno
        32 + // probably wallet address
        32 + // probably escrow account
        8, // price
      length: 32,
    },
    filters: [
      {
        memcmp: {
          offset: 8 + 32,
          bytes: targetWallet,
        },
      },
      // filter by listing operation
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(new BN(operationType, 'le').toArray()),
        },
      },
    ],
  })
  .then(res => {
    class TokenAddress {
      constructor(args) {
        this.tokenAddress = args.tokenAddress;
      }
    }
    const SCHEMA = new Map([
      [
        TokenAddress,
        {
          kind: 'struct',
          fields: [['tokenAddress', 'pubkey']],
        },
      ],
    ]);
    if (res && Array.isArray(res)) {
      const mints = res.map(({ account }) =>
        deserializeUnchecked(SCHEMA, TokenAddress, account.data).tokenAddress.toString()
      );
      console.log(mints);
      return mints;
    } else {
      return null;
    }
  });
