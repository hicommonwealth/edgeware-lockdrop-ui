let provider, web3, isValidBase58Input;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const MAINNET_LOCKDROP = '0x1b75b90e60070d37cfa9d87affd124bb345bf70a';
const ROPSTEN_LOCKDROP = '0x5940864331bBB57a10FC55e72d88299D2Dce209C';
const LOCKDROP_ABI = JSON.stringify([{"constant":true,"inputs":[],"name":"LOCK_START_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_END_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_DROP_PERIOD","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_origin","type":"address"},{"name":"_nonce","type":"uint32"}],"name":"addressFrom","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"pure","type":"function"},{"constant":false,"inputs":[{"name":"contractAddr","type":"address"},{"name":"nonce","type":"uint32"},{"name":"edgewareAddr","type":"bytes"}],"name":"signal","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"term","type":"uint8"},{"name":"edgewareAddr","type":"bytes"},{"name":"isValidator","type":"bool"}],"name":"lock","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"inputs":[{"name":"startTime","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"eth","type":"uint256"},{"indexed":false,"name":"lockAddr","type":"address"},{"indexed":false,"name":"term","type":"uint8"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"isValidator","type":"bool"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Locked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"contractAddr","type":"address"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Signaled","type":"event"}]);

$(function() {
  $('#EDGEWARE_BASE58_ADDRESS').on('blur', function(e) {
    isValidBase58Input = validateBase58Input(e.target.value);
    if (e.target.value !== '' && !isValidBase58Input) {
      alert('Please enter a valid base58 edgeware public address!');
    }
  });

  $('input[name="network"]').change(function(e) {
    let network = $('input[name="network"]:checked').val();
    if (network === 'mainnet') {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(MAINNET_LOCKDROP);
    } else if (network === 'ropsten') {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(ROPSTEN_LOCKDROP);
    } else {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(MAINNET_LOCKDROP);
    }
  });

  $('input[name="locktime"]').change(function(e) {
    var val = $('input[name="locktime"]:checked').val();
    if (val === 'signal') {
      $('.body-container').removeClass('locking');
      $('.body-container').addClass('signaling');
    } else if (val.startsWith('lock')) {
      $('.body-container').addClass('locking');
      $('.body-container').removeClass('signaling');
    } else {
      $('.body-container').removeClass('locking');
      $('.body-container').removeClass('signaling');
    }
  });

  $('button.metamask').click(async function() {
    if (!isValidBase58Input) {
      alert('Please enter a valid base58 edgeware public address!');
      return;
    } else {
      // Setup ethereum connection and web3 provider
      await enableMetamaskEthereumConnection();
      setupMetamaskWeb3Provider();
      // Grab form data
      let { returnTransaction, params, failure, reason } = await configureTransaction(true);
      if (failure) {
        alert(reason);
        return;
      }
      $('.participation-option').hide();
      $('.participation-option.metamask').slideDown(100);
      $('.participation-option.metamask .metamask-error').text('').hide();
      $('.participation-option.metamask .metamask-success').text('').hide();
      // Send transaction if successfully configured transaction
      returnTransaction.send(params, function(err, txHash) {
        if (err) {
          console.log(err);
          $('.participation-option.metamask .metamask-error').show()
            .text(err.message);
        } else {
          console.log(txHash);
          $('.participation-option.metamask .metamask-success').show()
            .text('Success! Transaction submitted');
        }
      });
    }
  });
  $('button.mycrypto').click(async function() {
    if (!isValidBase58Input) {
      alert('Please enter a valid base58 edgeware public address!');
      return;
    } else {
      setupInfuraWeb3Provider();
      let { returnTransaction, params, failure, reason, args } = await configureTransaction(false);
      if (failure) {
        alert(reason);
        return;
      }
      $('.participation-option').hide();
      $('.participation-option.mycrypto').slideDown(100);
      // Create arg string
      let myCryptoArgs = Object.keys(args).map((a, inx) => {
        if (inx == Object.keys(args).length - 1) {
          return `${a}: ${args[a]}`;
        } else {
          return `${a}: ${args[a]}\n`;
        }
      }).reduce((prev, curr) => {
        return prev.concat(curr);
      }, "");

      $('#LOCKDROP_MYCRYPTO_CONTRACT_ADDRESS').text($('#LOCKDROP_CONTRACT_ADDRESS').val());
      $('#LOCKDROP_MYCRYPTO_ABI').text(LOCKDROP_ABI);
      $('#LOCKDROP_MYCRYPTO_ARGUMENTS').text(myCryptoArgs);
    }
  });
  $('button.cli').click(function() {
    if (!isValidBase58Input) {
      alert('Please enter a valid base58 edgeware public address!');
      return;
    }
    $('.participation-option').hide();
    $('.participation-option.cli').slideDown(100);
    let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
    let edgewareBase58Address = $('#EDGEWARE_BASE58_ADDRESS').val();
    const dotenv = `# ETH config
ETH_PRIVATE_KEY=<ENTER_YOUR_PRIVATE_KEY_HEX_HERE>

# Node/provider config
INFURA_PATH=v3/<INSERT_INFURA_API_KEY_HERE>

# Lockdrop config
LOCKDROP_CONTRACT_ADDRESS=${lockdropContractAddress}

# Edgeware config
EDGEWARE_PUBLIC_ADDRESS=${edgewareBase58Address}`;
    $('#LOCKDROP_DOTENV').text(dotenv);
  });

  $('button.commonwealth-ui').click(function() {
    $('.generate-option').hide();
    $('.generate-option.commonwealth-ui').slideDown(100);
  });

  $('button.rust').click(function() {
    $('.generate-option').hide();
    $('.generate-option.rust').slideDown(100);
  });
});

async function configureTransaction(isMetamask) {
  let failure = false;
  let returnTransaction, params, reason, args;

  let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
  let edgewareBase58Address = $('#EDGEWARE_BASE58_ADDRESS').val();
  let lockdropLocktimeFormValue = $('input[name=locktime]:checked').val();
  let validatorIntent = ($('input[name=validator]:checked').val() === 'yes') ? true : false;

  // Encode Edgeware address in hex for Ethereum transactions
  const encodedEdgewareAddress = '0x' + toHexString(fromB58(edgewareBase58Address));
  // Grab lockdrop JSON and instantiate contract
  const json = await $.getJSON('Lockdrop.json');
  const contract = new web3.eth.Contract(json.abi, lockdropContractAddress);
  // Switch on transaction type
  const signaling = (lockdropLocktimeFormValue === 'signal');
  if (!signaling) {
    let ethLockAmount = $('#ETH_LOCK_AMOUNT').val();
    if (isNaN(+ethLockAmount) || +ethLockAmount <= 0) {
      alert('Please enter a valid ETH amount!');
      return;
    }

    // Calculate lock term as enum values
    const lockdropLocktime = (lockdropLocktimeFormValue === 'lock3') ?
          0 : ((lockdropLocktimeFormValue === 'lock6') ?
               1 : 2);

    // Params are only needed for sending transactions directly i.e. from Metamask
    if (isMetamask) {
      const coinbaseAcct = await web3.eth.getCoinbase();
      params = {
        from: coinbaseAcct,
        value: web3.utils.toWei(ethLockAmount, 'ether'),
        gasLimit: 100000,
      };
    }
    returnTransaction = contract.methods.lock(lockdropLocktime, encodedEdgewareAddress, validatorIntent);
    args = {
      term: lockdropLocktime,
      edgewareAddr: encodedEdgewareAddress,
      isValidator: validatorIntent,
    };
  } else {
    if (isMetamask) {
      const coinbaseAcct = await web3.eth.getCoinbase();
      params = { from: coinbaseAcct, gasLimit: 100000 };
    }

    // FIXME: Create these inputs for signalers
    let signalingContractAddress = $('#SIGNALING_CONTRACT_ADDR').val();
    let signalingContractNonce = $('#SIGNALING_CONTRACT_NONCE').val();

    let res = validateContractAddress(signalingContractAddress, signalingContractNonce);
    if (!isMetamask && res.failure) {
      return res;
    } else {
      signalingContractAddress = signalingContractAddress || params.from;
      signalingContractNonce = signalingContractNonce || 0;
    }

    returnTransaction = contract.methods.signal(signalingContractAddress, signalingContractNonce, encodedEdgewareAddress);
    args = {
      contractAddr: signalingContractAddress,
      nonce: signalingContractNonce,
      edgewareAddr: encodedEdgewareAddress,
    };
  }
  return { returnTransaction, params, failure, reason, args };
}

/**
 * Ensure that the input is a formed correctly
 * @param {String} input
 */
function validateBase58Input(input) {
  // Keys should be formatted as '5GYyKi34emBk54Tf6t3xRgq71x8jRVLykaQqwkJKP76pGwry'
  if (input.length != 48) return false;

  for (var inx in input) {
    if (BASE58_ALPHABET.indexOf(input[inx]) == -1) {
      return false;
    }
  }
  return true;
}

/**
 * Ensure that the contract address and nonce are properly formatted
 */
function validateContractAddress(contractAddress, nonce) {
  if (!contractAddress || !nonce) {
    return {
      failure: true,
      reason: 'No signaling contract or nonce provided for generating tx data',
    };
  }

  if (isNaN(nonce)) {
    return {
      failure: true,
      reason: 'Nonce must be an integer',
    };
  }

  if (contractAddress.indexOf('0x') > 0 && contractAddress.length !== 42) {
    return {
      failure: true,
      reason: 'Contract address is not valid, it contains 0x but must by 20 bytes in length',
    };
  }

  if (contractAddress.indexOf('0x') === -1 && contractAddress.length !== 40) {
    return {
      failure: true,
      reason: 'Contract address is not valid, it does not contain 0x nor is it 20 bytes',
    };
  }

  return { failure: false };
}

/**
 * Setup web3 provider using Metamask's injected providers
 */
function setupMetamaskWeb3Provider() {
  // Setup web3 provider
  if (typeof window.ethereum !== 'undefined' || (typeof window.web3 !== 'undefined')) {
    // Web3 browser user detected. You can now use the provider.
    provider = window.ethereum || window.web3.currentProvider;
  }

  web3 = new window.Web3(provider);
}

/**
 * Setup web3 provider using Infura Public Gateway
 */
function setupInfuraWeb3Provider() {
  if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
  } else {
    // Set the provider you want from Web3.providers
    web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io'));
  }
}

/**
 * Enable connection between browser and Metamask
 */
async function enableMetamaskEthereumConnection() {
  try {
    await ethereum.enable();
  } catch (error) {
    // Handle error. Likely the user rejected the login:
    alert('Could not find Web3 provider/Ethereum wallet');
  }
}

/**
 * Encodes a Uint8Array (byte array) into a hex string
 * @param {Uint8Array} bytes to convert to hex
 */
function toHexString(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

/**
 * Decode a base58 string into a Uint8Array (byte array)
 * @param {String} input to decode
 */
function fromB58(input) {
  var d = [],   //the array for storing the stream of decoded bytes
      b = [],   //the result byte array that will be returned
      i,        //the iterator variable for the base58 string
      j,        //the iterator variable for the byte array (d)
      c,        //the carry amount variable that is used to overflow from the current byte to the next byte
      n;        //a temporary placeholder variable for the current byte
  for(i in input) { //loop through each base58 character in the input string
      j = 0,                             //reset the byte iterator
      c = BASE58_ALPHABET.indexOf( input[i] );             //set the initial carry amount equal to the current base58 digit
      if(c < 0)                          //see if the base58 digit lookup is invalid (-1)
          return undefined;              //if invalid base58 digit, bail out and return undefined
      c || b.length ^ i ? i : b.push(0); //prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)
      while(j in d || c) {               //start looping through the bytes until there are no more bytes and no carry amount
          n = d[j];                      //set the placeholder for the current byte
          n = n ? n * 58 + c : c;        //shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)
          c = n >> 8;                    //find the new carry amount (1-byte shift of current byte value)
          d[j] = n % 256;                //reset the current byte to the remainder (the carry amount will pass on the overflow)
          j++                            //iterate to the next byte
      }
  }
  while(j--)               //since the byte array is backwards, loop through it in reverse order
      b.push( d[j] );      //append each byte to the result
  return new Uint8Array(b) //return the final byte array in Uint8Array format
}
