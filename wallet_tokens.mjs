//This script pulls data from a tezos wallet 
//It downloads the images/data at artifact_uri from the hicetnunc contract only
//It also saves a csv containing the token data for each NFT
//Alter wallet_address to select the wallet you want to pull data from (the next line)
const wallet_address = "tz1Zy53wh1Wb8Hdy5uNqeUdPKjaUeauzKRVS";
//It will sometimes fail downloading images from IPFS, I am not really sure why
//It will retry a couple of times, but won't log anything letting you know what it's missed if it fails enough times to not retry, I could've added functionality to log that, but I've not actually encounted it enough to warrent it for my purposes
//It uses the hicdex api, the following will need altering if anything chages there
const api = "https://api.hicdex.com/v1/graphql"
//It also uses the public ipfs stuff to get the images
const ipfsUrl = 'https://ipfs.io/ipfs/';
//sometimes I wanted to rerun the script skipping x number of images I'd already downloaded (functionality from a previous script really, haven't used it here but the variable is here)
const skipCount = 0;
//I ran into some issues related to windows filing system illegal/reserved characters, which should be captured by the following regex, but I don't really know enough about taht
const illegalCharsRegex = /[<>:"\/\\|?*\x00-\x1F]/g; // Regular expression to match illegal characters
//in a previous version of the script upon which this is based, it was having issues with modules so this script requires the --experimental-modules flags thing to work 
//run "node --experimental-modules wallet_tokens.mjs" to run the script
//
//
//There are some commented console.logs from testing of the script
//
//
//Written in collaboration with chatGPT - it's a bit janky but it works....


import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const axios = require('axios');
const ObjectsToCsv = require('objects-to-csv');
import fetch from 'node-fetch';


//hicdex query from https://hicdex.com/collector-gallery
async function fetchGraphQL(operationsDoc, operationName, variables) {
  const result = await fetch(api, {
    method: "POST",
    body: JSON.stringify({
      query: operationsDoc,
      variables: variables,
      operationName: operationName,
    }),
  });

  return await result.json();
}

async function doFetch() {
  const query = `
    query collectorGallery($address: String!) {
      hic_et_nunc_token_holder(
        where: {
          holder_id: {_eq: $address}
          quantity: {_gt: "0"}
          token: { supply: { _gt: "0" } }
        }
        order_by: { id: desc }
      ) {
        token {
          id
          artifact_uri
          display_uri
          thumbnail_uri
          timestamp
          mime
          title
          description
          supply
          token_tags {
            tag {
              tag
            }
          }
          creator {
            address
          }
          swaps(where: { status: { _eq: "0" } }, order_by: { price: asc }) {
            amount
            amount_left
            creator_id
            price
          }
        }
      }
    }
  `;

  const { errors, data } = await fetchGraphQL(query, "collectorGallery", {
    address: `${wallet_address}`,
  });

  if (errors) {
    console.error(errors);
  }

  const result = data.hic_et_nunc_token_holder;
  //console.log({ result });
  return result;
}


async function saveImages(data, skipCount) {
  const imageDir = `./images/${wallet_address}`;
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  for (let i = 0; i < data.length; i++) {
    const token = data[i].token;
    console.log("token: ", i);
    const maxRetrys = 2;
    const Delay = 25000;
    let retryCount = 0;
    let success = false;
    while (!success && retryCount < maxRetrys) {
      try {
        const response = await axios.get(`${ipfsUrl}${token.artifact_uri.slice(7)}`, {
          responseType: 'arraybuffer'
        });
        const imageName = `${token.title}.jpg`;
        const sanitisedImageName = imageName.replace(illegalCharsRegex, '_');
        fs.writeFileSync(`${imageDir}/${token.id} - ${sanitisedImageName}`, Buffer.from(response.data));
        console.log(`Saved image for token ${token.title}`);
        success = true;
      } catch (error) {
        if (error.code === 'ERR_REQUEST_ABORTED') {
          retryCount++;
          console.log(`Request aborted. Retrying (${retryCount}/${maxRetrys})...`);
          await new Promise(resolve => setTimeout(resolve, Delay));
        } else {
          console.error(`Error saving image ${token.title} : ${error.message}`);
          break;
        }
      }
    }
  }
}


async function saveToCsv(data) {
  const csv = new ObjectsToCsv(data);
  const fileName = `./images/tokens.csv`;
  await csv.toDisk(fileName);
  console.log(`Data saved to ${fileName}`);
}

async function resolve() {
  const tokensData = await doFetch();
  await saveImages(tokensData);
  await saveToCsv(tokensData);
  //console.log(tokensData);
}

resolve();
