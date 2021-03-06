/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if(this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to
     * create the `block hash` and push the block into the chain array. Don't for get
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention
     * that this method is a private method.
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
          try{
            //checking for genesis block, if not genesis, give previous Block hash
            if(self.chain.length>0){
              block.previousBlockHash = self.chain[self.chain.length-1].hash
            }
            block.height = this.chain.length;
            //call current datetime and format to string
            block.time = new Date().getTime().toString().slice(0,-3);
            //call sha256 to calculate the hash for block
            block.hash = SHA256(JSON.stringify(block)).toString();
            //push new block onto chain
            self.chain.push(block);
            //count new block being placed on chain
            self.height++;
            //validating the blockchain (changed from if statement, didn't make sense)
            await self.validateChain();
            //resolve block
            resolve(block)
          } catch {
            reject("Something went wrong in addBlock.")
          }
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
          //create string message to provide for signing
          let message = address+":"+new Date().getTime().toString().slice(0,-3)+ ":starRegistry";
          //pass message
          resolve(message)
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address
     * @param {*} message
     * @param {*} signature
     * @param {*} star
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
          try{
          //return the datetime of the message
          let messageTime = parseInt(message.split(":")[1]);
          //return the current datetime
          let currentTime = parseInt(new Date().getTime().toString().slice(0,-3));
          //checking if time elapsed is less than 5 minutes
          if ((currentTime-messageTime) < 300 && bitcoinMessage.verify(message, address, signature)) {
            //if it has been less than 5 minutes, let's verify
            //if verification true, create block with star data
            let starBlock = new BlockClass.Block({address:address, signature:signature, message:message, star:star});
            //add the block
            resolve(await self._addBlock(starBlock));
          } else {
            //if longer than 5 minutes and did not pass verification
            reject("Did not meet requirements.")
          }
        }
        catch {
          reject(Error("Something went wrong in submitStar."))
        }
      });

    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash
     */

    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
          let block = self.chain.filter(p => p.hash === hash)[0];
          //if provided hash matches hash in the chain, return the block.
          //if not, return nothing.
          if(block){
              resolve(block);
          } else {
              resolve("This hash does not exist within the chain.");
          }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object
     * with the height equal to the parameter `height`
     * @param {*} height
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve("This block does not exist within the chain.");
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];

        return new Promise((resolve, reject) => {
            //iterate through chain looking for wallet, pushing stars to null
            self.chain.forEach(async (block) => {
              try {
                //initialize data with data fecthed from block with Block.getBdata
                let data = await block.getBData();
                //if the address matches data in block, push data to star variable
                if (data.address === address) {
                  //push stars into array
                  stars.push(data);
                } else {
                  reject("This address does not exist within chain.")
                }
                //pass each star found associated to address
                resolve(stars);
              } catch {
                reject(Error("Something went wrong in getStarsByWalletAddress."));
              }
            });
          });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
          try {
            self.chain.forEach(async block => {
              //initialize null variable for genesis block
              let previousBlockHash = null;
              //initialize varible to take on boolean from BlockClass.validate
              let validateBlock = await block.validate();
              //if the validate fuction isn't true
              if (!validateBlock) {
                errorLog.push("Block "+block.height+" is not valid.")
              };
              //check if previousBlockHash matches current.
              if (block.previousBlockHash !== previousBlockHash) {
                errorLog.push("Block "+block.height+" hash did not match previous blocks hash.");
              }
              //pass the current hash back to variable for comparison in next iter
              previousBlockHash = block.hash;
            });
          resolve(errorLog)
        }
        catch{
            reject(Error("Something went wrong in validateChain."))
          }
        });
      }
}

module.exports.Blockchain = Blockchain;
