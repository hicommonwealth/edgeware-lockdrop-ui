let provider, web3, isValidBase58Input;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

$(function() {
  $('#EDGEWARE_BASE58_ADDRESS').change(function(e) {
    isValidBase58Input = validateBase58Input(e.target.value);
  });

  $('button.metamask').click(async function() {
    $('.participation-option').hide();
    $('.participation-option.metamask').slideDown(100);
    // Setup ethereum connection and web3 provider
    await enableEthereumConnection();
    setupWeb3Provider();

    // Grab form data
    let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
    let edgewareBase58Address = $('#EDGEWARE_BASE58_ADDRESS').val();
    let lockdropLocktimeFormValue = $('input[name=locktime]:checked').val();
    let validatorIntent = $('input[name=validator]:checked').val();
    // Check base58 input before continuing
    if (!isValidBase58Input) {
      alert('Please enter a valid base58 edgeware public address!');
      return;
    }

    // Encode Edgeware address in hex for Ethereum transactions
    const encodedEdgewareAddress = `0x${toHexString(fromB58(edgewareBase58Address))}`;

    // Grab lockdrop JSON and instantiate contract
    const json = await $.getJSON('Lockdrop.json');
    const contract = web3.eth.contract(json.abi).at(lockdropContractAddress);

    // Calculate lock term as enum values
    const signaling = (lockdropLocktimeFormValue === 'signal');
    if (!signaling) {
      const lockdropLocktime = (lockdropLocktimeFormValue === 'lock3')
      ? 0 : (lockdropLocktimeFormValue === 'lock6')
        ? 1 : 2;

      const params = {
        value: web3.toWei(1, 'ether'),
      };
      // const value = $('#LOCKDROP_LOCK_AMOUNT").val()
      contract.lock(lockdropLocktime, encodedEdgewareAddress, validatorIntent, params, function(err, txHash) {
        if (err) {
          console.log(err);
        } else {
          console.log(txHash);
        }
      });
    } else {
      // FIXME: Create these inputs for signalers
      const signalingContractAddress = $('#SIGNALING_CONTRACT_ADDR');
      const signalingContractNonce = $('#SIGNALING_CONTRACT_NONCE');
      contract.signal(signalingContractAddress, signalingContractNonce, encodedEdgewareAddress, function(err, txHash) {
        if (err) {
          console.log(err);
        } else {
          console.log(txHash);
        }
      });
    }
  });
  $('button.mycrypto').click(function() {
    $('.participation-option').hide();
    $('.participation-option.mycrypto').slideDown(100);
  });
  $('button.cli').click(function() {
    $('.participation-option').hide();
    $('.participation-option.cli').slideDown(100);
  });
});


/**
 * Ensure that the input is a formed correctly
 * @param {String} input 
 */
function validateBase58Input(input) {
  for (inx in input) {
    if (BASE58_ALPHABET.indexOf(input[inx]) == -1) {
      return false;
    }
  }
  return true;
}

/**
 * Setup web3 provider using Metamask's injected providers
 */
function setupWeb3Provider() {
  // Setup web3 provider
  if (typeof window.ethereum !== 'undefined' || (typeof window.web3 !== 'undefined')) {
    // Web3 browser user detected. You can now use the provider.
    provider = window['ethereum'] || window.web3.currentProvider
  }

  web3 = new Web3(provider);
}

/**
 * Enable connection between browser and Metamask
 */
async function enableEthereumConnection() {
  try {
    const accounts = await ethereum.enable()
  } catch (error) {
    // Handle error. Likely the user rejected the login:
    console.log(reason === 'User rejected provider access')
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
