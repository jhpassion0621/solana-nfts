const METADATA_PREFIX = "metadata";

const MetadataKey = {
  Uninitialized: 0,
  MetadataV1: 4,
  EditionV1: 1,
  MasterEditionV1: 2,
  MasterEditionV2: 6,
  EditionMarker: 7,
};

// types for Borsch
function Creator(args) {
  this.address = args.address;
  this.verified = args.verified;
  this.share = args.share;
}

function Data(args) {
  this.name = args.name;
  this.symbol = args.symbol;
  this.uri = args.uri;
  this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
  this.creators = args.creators;
}

function Metadata(args) {
  this.key = MetadataKey.MetadataV1;
  this.updateAuthority = args.updateAuthority;
  this.mint = args.mint;
  this.data = args.data;
  this.primarySaleHappened = args.primarySaleHappened;
  this.isMutable = args.isMutable;
  this.editionNonce = args.editionNonce;
}

const METADATA_SCHEMA = new Map([
  [
    Data,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["symbol", "string"],
        ["uri", "string"],
        ["sellerFeeBasisPoints", "u16"],
        ["creators", { kind: "option", type: [Creator] }],
      ],
    },
  ],
  [
    Creator,
    {
      kind: "struct",
      fields: [
        ["address", "pubkey"],
        ["verified", "u8"],
        ["share", "u8"],
      ],
    },
  ],
  [
    Metadata,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["updateAuthority", "pubkey"],
        ["mint", "pubkey"],
        ["data", Data],
        ["primarySaleHappened", "u8"],
        ["isMutable", "u8"], // bool
      ],
    },
  ],
]);

export { METADATA_SCHEMA, METADATA_PREFIX, Metadata };
