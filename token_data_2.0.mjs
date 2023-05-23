import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { TezosToolkit } = require('@taquito/taquito');
const Multihashes = require('multihashes');
const bs58 = require('bs58');
const fs = require('fs');
const axios = require('axios');
const ObjectsToCsv = require('objects-to-csv');
import fetch from 'node-fetch';



const tezos = new TezosToolkit("https://mainnet.api.tez.ie")
const contractAddress = 'KT1VTaKud8PnviihT7xzwn7FvrXdV3GCEWYF';
const ipfsUrl = 'https://ipfs.io/ipfs/';


async function getAllTokenIds() {
  const contract = await tezos.contract.at(contractAddress);
  const storage = await contract.storage();
  const tokenIds = storage.all_tokens.toNumber();
  console.log(tokenIds);
  return tokenIds;
}

async function getCollectionData(){
  const contract = await tezos.contract.at(contractAddress);
  const storage = await contract.storage();
  const collectionMeta = await storage.metadata.get("".toString());
  const bytes = bs58.decode(Multihashes.toB58String(Buffer.from(collectionMeta, 'hex'))); //decode bs58 string
  const ipfslink = bytes.toString().slice(7);
  const response = await fetch(ipfsUrl + ipfslink);
  const collectiondata = await response.json();
  return collectiondata;
}

async function getTokenData(skipCount) {
  const tokenQuantity = await getAllTokenIds();
  const metadata = [];


  for (let i = skipCount; i < tokenQuantity; i++) {
    const contract = await tezos.contract.at(contractAddress);
    const storage = await contract.storage();
    const token = await storage.token_metadata.get(i.toString());
    console.log(i);
    metadata.push({
      token,
    });
  }
  return metadata;
}

async function ipfsLinks(metadata){
  const metadataList = [];

  for (let i = 0; i < metadata.length; i++) {
    const tokenInfo = metadata[i].token.token_info;
    const ipfs = tokenInfo.valueMap;
    metadataList.push(ipfs);
  }

  const HexData = metadataList.map((map) => map.get('""'));

  //console.log("Token 'i' of metadata : ", HexData);


  const ipfsHashes = [];
  for (let i = 0; i < HexData.length; i++) {
    const value = HexData[i];
    const buf = Buffer.from(value, 'hex');
    const multihash = Multihashes.toB58String(buf);
    const bytes = bs58.decode(multihash); //decode bs58 string
    const ipfs = bytes.toString().slice(7);
    ipfsHashes.push(ipfs); 
  }

  console.log(ipfsHashes);
return ipfsHashes
}

async function getTokenMetadata(ipfsHashes) {
  const token_metadata = [];
  for (let i = 0; i < ipfsHashes.length; i++) {
    const ipfsHash = ipfsHashes[i];
    console.log(`IPFS HASH: ${ipfsHash}`);
    const response = await fetch(ipfsUrl + ipfsHash);
    console.log(`Response: ${response}`);
    const json = await response.json();
    console.log(`JSON ${i}`);
    token_metadata.push(json);
  }
//console.log(token_metadata);
return token_metadata
}

// extract artifactUri, diplayUri, thumbnailUri, and image entries for each tokensdata array entry and save the image at each ipfs link (which are in the form artifactUri: 'ipfs://[IPFSHASH]', for example) with the name of each token (tokens data objkt entry name: '[TOKEN_NAME]')
async function extractData(tokensdata) {
    const data = tokensdata.map((token) => {
      const name = token.name;
      const description = token.description;
      const rights = token.rights;
      const date = token.date;  
      const tags = token.dags;
      const artifactUri = token.artifactUri;
      const diplayUri = token.displayUri;
      const thumbnailUri = token.thumbnailUri;
      const creators = token.creators;
      
      return {
        name,
        description,
        rights,
        date,
        tags,
        artifactUri,
        diplayUri,
        thumbnailUri,
        creators,
      };
    });
  
    return data;
  }

  const col_data_json = await getCollectionData();

  const illegalCharsRegex = /[<>:"\/\\|?*\x00-\x1F]/g; // Regular expression to match illegal characters

/*
  async function saveImages(data, skipCount) {
    const testImageDir = col_data_json.name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    const imageDir = `./images/${testImageDir}`;
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
  
    for (let i = 0; i < data.length; i++) {
      const token = data[i];
      try {
      const response = await axios.get(`${ipfsUrl}${token.artifactUri.slice(7)}`, {
        responseType: 'arraybuffer'
      });
      const imageName = `${token.name}.jpg`;
      const sanitisedImageName = imageName.replace(illegalCharsRegex, '_'); // Replace illegal characters with underscores
      fs.writeFileSync(`${imageDir}/${i+skipCount} - ${sanitisedImageName}`, Buffer.from(response.data));
      console.log(`${i}. Saved image for token ${token.name}`);
    } catch (error) {
      console.error(`Error saving image for token ${token.name}: ${error.message}`);
    }
      await new Promise(resolve => setTimeout(resolve, 25000)); // wait for X000 second before starting the next download
    }
  }
*/

async function saveImages(data, skipCount) {
  const testImageDir = col_data_json.name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
  const imageDir = `./images/${testImageDir}`;
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  for (let i = 0; i < data.length; i++) {
    const token = data[i];
    const maxRetrys = 2;
    const Delay = 25000;
    let retryCount = 0;
    let success = false;
    while (!success && retryCount < maxRetrys) {
      try {
        const response = await axios.get(`${ipfsUrl}${token.artifactUri.slice(7)}`, {
          responseType: 'arraybuffer'
        });
        const imageName = `${token.name}.jpg`;
        const sanitisedImageName = imageName.replace(illegalCharsRegex, '_');
        fs.writeFileSync(`${imageDir}/${i+skipCount} - ${sanitisedImageName}`, Buffer.from(response.data));
        console.log(`Saved image for token ${token.name}`);
        success = true;
      } catch (error) {
        if (error.code === 'ERR_REQUEST_ABORTED') {
          retryCount++;
          console.log(`Request aborted. Retrying (${retryCount}/${maxRetrys})...`);
          await new Promise(resolve => setTimeout(resolve, Delay));
        } else {
          console.error(`Error saving image ${token.name} : ${error.message}`);
          break;
        }
      }
    }
  }
}


  // save tokensdata to a csv file with contract address as the name and each entry in the tokensdata array as a line on the csv
  async function saveToCsv(data) {
    const csv = new ObjectsToCsv(data);
    const testcsvDir = col_data_json.name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    const csvDir = `./images/${testcsvDir}`;
    const fileName = `${csvDir}/${testcsvDir}.csv`;
    await csv.toDisk(fileName);
    console.log(`Data saved to ${fileName}`);
  }

  async function resolve() {
    const skipCount = 0;
    const ipfslinks = await ipfsLinks(await getTokenData(skipCount));
    console.log(`obtained links`);
    const tokensdata = await getTokenMetadata(ipfslinks);
    console.log(`obtained tokensdata`);
    const extractedData = await extractData(tokensdata);
    console.log(`extracted data`);

    await saveImages(extractedData, skipCount);
    await saveToCsv(tokensdata);
  
    console.log(extractedData);
  }
  
  resolve();