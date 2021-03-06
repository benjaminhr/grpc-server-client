const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const utils = require("../utils/tools");
const blockMult = require("../utils/blockmult");
const { resolve } = require("path");
const PROTO_PATH = "blockmult.proto";

/*
  Load grpc definition file and create client server
*/
const definition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  arrays: true,
});

const BlockMultService = grpc.loadPackageDefinition(definition)
  .BlockMultService;

const port = process.env.PORT || 30043;
const host = process.env.HOST || "0.0.0.0";
const address = `${host}:${port}`;
const client = new BlockMultService(address, grpc.credentials.createInsecure());

// Global variable for blockmult functions
const MAX = 4;

/*
  Wrapper function which creates protobuf acceptable block
  data structure, and then calls grpc multiplyBlock function
*/
async function multiplyBlockRPC(A, B) {
  return new Promise((resolve, reject) => {
    const block = utils.createBlock(A, B, MAX);

    client.multiplyBlock(block, (err, res) => {
      if (err) reject(err);

      const matrix = utils.convertProtoBufToArray(res.block);
      resolve(matrix);
    });
  });
}

/*
  Wrapper function which creates protobuf acceptable block
  data structure, and then calls grpc addBlock function 
*/
async function addBlockRPC(A, B) {
  return new Promise((resolve, reject) => {
    const block = utils.createBlock(A, B, MAX);

    client.addBlock(block, (err, res) => {
      if (err) reject(err);

      const matrix = utils.convertProtoBufToArray(res.block);
      resolve(matrix);
    });
  });
}

async function multiplyMatrixBlock(A, B) {
  if (!A || !B) {
    throw new Error("A or B matrices are undefined");
  } else if (A[0].constructor !== Array || B[0].constructor !== Array) {
    throw new Error("A or B is not a 2D array");
  }

  const bSize = 2;
  let A1 = [...Array(MAX)].map((_) => Array(MAX));
  let A2 = [...Array(MAX)].map((_) => Array(MAX));
  let A3 = [...Array(MAX)].map((_) => Array(MAX));
  let B1 = [...Array(MAX)].map((_) => Array(MAX));
  let B2 = [...Array(MAX)].map((_) => Array(MAX));
  let B3 = [...Array(MAX)].map((_) => Array(MAX));
  let C1 = [...Array(MAX)].map((_) => Array(MAX));
  let C2 = [...Array(MAX)].map((_) => Array(MAX));
  let C3 = [...Array(MAX)].map((_) => Array(MAX));
  let D1 = [...Array(MAX)].map((_) => Array(MAX));
  let D2 = [...Array(MAX)].map((_) => Array(MAX));
  let D3 = [...Array(MAX)].map((_) => Array(MAX));
  let res = [...Array(MAX)].map((_) => Array(MAX));

  for (let i = 0; i < bSize; i++) {
    for (let j = 0; j < bSize; j++) {
      A1[i][j] = A[i][j];
      A2[i][j] = B[i][j];
    }
  }

  for (let i = 0; i < bSize; i++) {
    for (let j = bSize; j < MAX; j++) {
      B1[i][j - bSize] = A[i][j];
      B2[i][j - bSize] = B[i][j];
    }
  }

  for (let i = bSize; i < MAX; i++) {
    for (let j = 0; j < bSize; j++) {
      C1[i - bSize][j] = A[i][j];
      C2[i - bSize][j] = B[i][j];
    }
  }

  for (let i = bSize; i < MAX; i++) {
    for (let j = bSize; j < MAX; j++) {
      D1[i - bSize][j - bSize] = A[i][j];
      D2[i - bSize][j - bSize] = B[i][j];
    }
  }

  A3 = await addBlockRPC(
    await multiplyBlockRPC(A1, A2),
    await multiplyBlockRPC(B1, C2)
  );
  B3 = await addBlockRPC(
    await multiplyBlockRPC(A1, B2),
    await multiplyBlockRPC(B1, D2)
  );
  C3 = await addBlockRPC(
    await multiplyBlockRPC(C1, A2),
    await multiplyBlockRPC(D1, C2)
  );
  D3 = await addBlockRPC(
    await multiplyBlockRPC(C1, B2),
    await multiplyBlockRPC(D1, D2)
  );

  for (let i = 0; i < bSize; i++) {
    for (let j = 0; j < bSize; j++) {
      res[i][j] = A3[i][j];
    }
  }

  for (let i = 0; i < bSize; i++) {
    for (let j = bSize; j < MAX; j++) {
      res[i][j] = B3[i][j - bSize];
    }
  }

  for (let i = bSize; i < MAX; i++) {
    for (let j = 0; j < bSize; j++) {
      res[i][j] = C3[i - bSize][j];
    }
  }

  for (let i = bSize; i < MAX; i++) {
    for (let j = bSize; j < MAX; j++) {
      res[i][j] = D3[i - bSize][j - bSize];
    }
  }

  return res;
}

const A = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
];

const B = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
];

multiplyMatrixBlock(A, B).then(console.log).catch(console.log);
