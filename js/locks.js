let provider, web3;
const MAINNET_LOCKDROP = '0x1b75b90e60070d37cfa9d87affd124bb345bf70a';
const ROPSTEN_LOCKDROP = '0x111ee804560787E0bFC1898ed79DAe24F2457a04';
const LOCKDROP_ABI = JSON.stringify([{"constant":true,"inputs":[],"name":"LOCK_START_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_END_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_DROP_PERIOD","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_origin","type":"address"},{"name":"_nonce","type":"uint32"}],"name":"addressFrom","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"pure","type":"function"},{"constant":false,"inputs":[{"name":"contractAddr","type":"address"},{"name":"nonce","type":"uint32"},{"name":"edgewareAddr","type":"bytes"}],"name":"signal","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"term","type":"uint8"},{"name":"edgewareAddr","type":"bytes"},{"name":"isValidator","type":"bool"}],"name":"lock","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"inputs":[{"name":"startTime","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"eth","type":"uint256"},{"indexed":false,"name":"lockAddr","type":"address"},{"indexed":false,"name":"term","type":"uint8"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"isValidator","type":"bool"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Locked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"contractAddr","type":"address"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Signaled","type":"event"}]);
// UNIX dates for lockdrop reward events
const JUNE_1ST_UTC = 1559347200;
const JUNE_16TH_UTC = 1560643200;
const JULY_1ST_UTC = 1561939200;
const JULY_16TH_UTC = 1563235200;
const JULY_31ST_UTC = 1564531200;
const AUG_15TH_UTC = 1565827200;
const AUG_30TH_UTC = 1567123200;

$(async function() {
  setupWeb3Provider();
  $('input[name="network"]').change(async function(e) {
    let network = $('input[name="network"]:checked').val();
    if (network === 'mainnet') {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(MAINNET_LOCKDROP);
      await drawChart();
    } else if (network === 'ropsten') {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(ROPSTEN_LOCKDROP);
      await drawChart();
    } else {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(MAINNET_LOCKDROP);
      await drawChart();
    }
  });

  $('#LOCK_LOOKUP_BTN').click(async function() {
    let addr = $('#LOCKDROP_PARTICIPANT_ADDRESS').val();
    // Sanitize address input
    if (!isHex(addr)) {
      alert('You must input a valid hex encoded Ethereum address')
      return;
    } else if ((addr.length !== 42 && addr.indexOf('0x') !== -1) || 
        (addr.length !== 40 && addr.indexOf('0x') === -1)) {
      alert('You must input a valid lengthed Ethereum address')
      return;
    } else {
      if (addr.length === 40) {
        addr = `0x${addr}`;
      }
    }
    let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
    const json = await $.getJSON('Lockdrop.json');
    const contract = new web3.eth.Contract(json.abi, lockdropContractAddress);
    const lockEvents = await getLocks(contract, addr);
    const signalEvents = await getSignals(contract, addr);
    const now = await getCurrentTimestamp();
    // Append only 1 signal event others will not be counted
    if (signalEvents.length > 0) {
      let balance = await web3.eth.getBalance(signalEvents[0].returnValues.contractAddr);
      balance = web3.utils.fromWei(balance, 'ether');
      $('#LOCK_LOOKUP_RESULTS').append($([
        '<li>',
        '   <div>',
        '     <h3>Signal Event</h3>',
        `     <p>ETH Signaled: ${balance}</p>`,
        `     <p>Signaling Address: ${signalEvents[0].returnValues.contractAddr}</p>`,
        `     <p>EDG Keys: ${signalEvents[0].returnValues.edgewareKey}</p>`,
        `     <p>Signal Time: ${signalEvents[0].returnValues.time}</p>`,
        '   </div>',
        '</li>',
      ].join('\n')))
    }
    // Parse out lock storage values
    let promises = lockEvents.map(async event => {
      let lockStorage = await getLockStorage(event.returnValues.lockAddr);
      return {
        owner: event.returnValues.owner,
        eth: web3.utils.fromWei(event.returnValues.eth, 'ether'),
        lockContractAddr: event.returnValues.lockAddr,
        term: event.returnValues.term,
        edgewarePublicKeys: event.returnValues.edgewareKey,
        unlockTime: `${(lockStorage.unlockTime - now) / 60} minutes`,
      };
    });
    // Create lock event list elements
    let results = await Promise.all(promises);
    results.map(r => {
      let listElt = $([
        '<li>',
        '   <div>',
        '     <h3>Lock Event</h3>',
        `     <p>Owner: ${r.owner}</p>`,
        `     <p>ETH Locked: ${r.eth}</p>`,
        `     <p>LUC Address: ${r.lockContractAddr}</p>`,
        `     <p>Term Length: ${(r.term === 0) ? '3 months' : (r.term === 1) ? '6 months' : '12 months'}</p>`,
        `     <p>EDG Keys: ${r.edgewarePublicKeys}</p>`,
        `     <p>Unlock Time: ${r.unlockTime}</p>`,
        '   </div>',
        '</li>',
      ].join('\n'));
      $('#LOCK_LOOKUP_RESULTS').append(listElt);
    });
  });
});

// Draw the chart and set the chart values
async function drawChart() {
  let summary = await getParticipationSummary();
  var vanillaData = google.visualization.arrayToDataTable([
    ['Type', 'Lock or signal action'],
    ['Locks', summary.totalETHLocked],
    ['Signals', summary.totalETHSignaled],
  ]);

  var effectiveData = google.visualization.arrayToDataTable([
    ['Type', 'Lock or signal action'],
    ['Locks', summary.totalEffectiveETHLocked],
    ['Signals', summary.totalEffectiveETHSignaled],
  ]);

  // Optional; add a title and set the width and height of the chart
  var vanillaOptions = {'title':'ETH locked or signaled', 'width':550, 'height':400};
  var effectiveOptions = {'title':'Effective ETH locked or signaled', 'width':550, 'height':400};

  // Display the chart inside the <div> element with id="piechart"
  var vanillaChart = new google.visualization.PieChart(document.getElementById('ETH_CHART'));
  vanillaChart.draw(vanillaData, vanillaOptions);

  var effectiveChart = new google.visualization.PieChart(document.getElementById('EFFECTIVE_ETH_CHART'));
  effectiveChart.draw(effectiveData, effectiveOptions);
}

function isHex(inputString) {
  const re = /^(0x)?[0-9A-Fa-f]+$/g;
  const result = re.test(inputString);
  re.lastIndex = 0;
  return result;
}

/**
 * Setup web3 provider using InjectedWeb3's injected providers
 */
function setupWeb3Provider() {
  // Setup web3 provider
  if (typeof window.ethereum !== 'undefined' || (typeof window.web3 !== 'undefined')) {
    // Web3 browser user detected. You can now use the provider.
    provider = window.ethereum || window.web3.currentProvider;
  } else {
    let network = $('input[name="network"]:checked').val();
    provider = new Web3.providers.HttpProvider(`https://${network}.infura.io`);
  }

  web3 = new window.Web3(provider);
}

/**
 * Enable connection between browser and InjectedWeb3
 */
async function enableInjectedWeb3EthereumConnection() {
  try {
    await ethereum.enable();
  } catch (error) {
    // Handle error. Likely the user rejected the login:
    alert('Could not find Web3 provider/Ethereum wallet');
  }
}

const getLocks = async (lockdropContract, address) => {
  return await lockdropContract.getPastEvents('Locked', {
    fromBlock: 0,
    toBlock: 'latest',
    filter: {
      owner: address,
    }
  });
};

const getSignals = async (lockdropContract, address) => {
  return await lockdropContract.getPastEvents('Signaled', {
    fromBlock: 0,
    toBlock: 'latest',
    filter: {
      contractAddr: address,
    }
  });
};

const getLockStorage = async (lockAddress) => {
  return Promise.all([0,1].map(v => {
    return web3.eth.getStorageAt(lockAddress, v);
  }))
  .then(vals => {
    return {
      owner: vals[0],
      unlockTime: web3.utils.hexToNumber(vals[1]),
    };
  });
};

const getCurrentTimestamp = async () => {
  const block = await web3.eth.getBlock("latest");
  return block.timestamp;
};

const getParticipationSummary = async () => {
  let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
  const json = await $.getJSON('Lockdrop.json');
  const contract = new web3.eth.Contract(json.abi, lockdropContractAddress);
  // Get balances of the lockdrop
  let { totalETHLocked, totalEffectiveETHLocked, numLocks } = await calculateEffectiveLocks(contract);
  let { totalETHSignaled, totalEffectiveETHSignaled, numSignals } = await calculateEffectiveSignals(contract);
  let totalETH = totalETHLocked.add(totalETHSignaled)
  let totalEffectiveETH = totalEffectiveETHLocked.add(totalEffectiveETHSignaled);
  let avgLock = totalETHLocked.div(web3.utils.toBN(numLocks));
  let avgSignal = totalETHSignaled.div(web3.utils.toBN(numSignals));
  return {
    totalETHLocked: Number(web3.utils.fromWei(totalETHLocked, 'ether')),
    totalEffectiveETHLocked: Number(web3.utils.fromWei(totalEffectiveETHLocked, 'ether')),
    totalETHSignaled: Number(web3.utils.fromWei(totalETHSignaled, 'ether')),
    totalEffectiveETHSignaled: Number(web3.utils.fromWei(totalEffectiveETHSignaled, 'ether')),
    totalETH: Number(web3.utils.fromWei(totalETH, 'ether')),
    totalEffectiveETH: Number(web3.utils.fromWei(totalEffectiveETH, 'ether')),
    numLocks,
    numSignals,
    avgLock: Number(web3.utils.fromWei(avgLock, 'ether')),
    avgSignal: Number(web3.utils.fromWei(avgSignal, 'ether')),
  };
}

const getTotalLockedBalance = async (lockdropContract) => {
  let { totalETHLocked, totalEffectiveETHLocked } = await calculateEffectiveLocks(lockdropContract);
  return { totalETHLocked, totalEffectiveETHLocked };
};

const getTotalSignaledBalance = async (lockdropContract) => {
  let { totalETHSignaled, totalEffectiveETHSignaled } = await calculateEffectiveSignals(lockdropContract);
  return { totalETHSignaled, totalEffectiveETHSignaled };
};

const calculateEffectiveLocks = async (lockdropContract) => {
  let totalETHLocked = web3.utils.toBN(0);
  let totalEffectiveETHLocked = web3.utils.toBN(0);
  // Get all lock events
  const lockEvents = await lockdropContract.getPastEvents('Locked', {
    fromBlock: 0,
    toBlock: 'latest',
  });

  // Compatibility with all contract formats
  let lockdropStartTime = (await lockdropContract.methods.LOCK_START_TIME().call());
  // Add balances and effective values to total
  lockEvents.forEach((event) => {
    const data = event.returnValues;
    let value = getEffectiveValue(data.eth, data.term, data.time, lockdropStartTime, totalETHLocked);
    totalETHLocked = totalETHLocked.add(web3.utils.toBN(data.eth));
    totalEffectiveETHLocked = totalEffectiveETHLocked.add(value);
  });
  // Return validating locks, locks, and total ETH locked
  return { totalETHLocked, totalEffectiveETHLocked, numLocks: lockEvents.length };
};

const calculateEffectiveSignals = async (lockdropContract, blockNumber=null) => {
  let totalETHSignaled = web3.utils.toBN(0);
  let totalEffectiveETHSignaled = web3.utils.toBN(0);
  const signalEvents = await lockdropContract.getPastEvents('Signaled', {
    fromBlock: 0,
    toBlock: 'latest',
  });

  const promises = signalEvents.map(async (event) => {
    const data = event.returnValues;
    // Get balance at block that lockdrop ends
    let balance;
    if (blockNumber) {
      balance = await web3.eth.getBalance(data.contractAddr, blockNumber);
    } else {
      balance = await web3.eth.getBalance(data.contractAddr);
    }
    // Get value for each signal event and add it to the collection
    let value = getEffectiveValue(balance, 'signaling');
    // Add value to total signaled ETH
    totalETHSignaled = totalETHSignaled.add(web3.utils.toBN(balance));
    totalEffectiveETHSignaled = totalEffectiveETHSignaled.add(value);
  });

  // Resolve promises to ensure all inner async functions have finished
  await Promise.all(promises);
  // Return signals and total ETH signaled
  return { totalETHSignaled, totalEffectiveETHSignaled, numSignals: signalEvents.length };
}

function getEffectiveValue(ethAmount, term, lockTime, lockStart, totalETH) {
  let additiveBonus;
  ethAmount = web3.utils.toBN(ethAmount);
  // get additive bonus if calculating allocation of locks
  if (lockTime && lockStart) {
    lockTime = web3.utils.toBN(lockTime);
    lockStart = web3.utils.toBN(lockStart);
    totalETH = web3.utils.toBN(totalETH);
    additiveBonus = getAdditiveBonus(lockTime, lockStart, totalETH);
  }

  if (term == '0') {
    // three month term yields no bonus
    return ethAmount.mul(web3.utils.toBN(100).add(additiveBonus)).div(web3.utils.toBN(100));
  } else if (term == '1') {
    // six month term yields 30% bonus
    return ethAmount.mul(web3.utils.toBN(130).add(additiveBonus)).div(web3.utils.toBN(100));
  } else if (term == '2') {
    // twelve month term yields 120% bonus
    return ethAmount.mul(web3.utils.toBN(220).add(additiveBonus)).div(web3.utils.toBN(100));
  } else if (term == 'signaling') {
    // 80% deduction
    return ethAmount.mul(web3.utils.toBN(20)).div(web3.utils.toBN(100));
  } else {
    // invalid term
    return web3.utils.toBN(0);
  }
}

const getAdditiveBonus = (lockTime, lockStart, currentTotalETH) => {
  if (!lockStart.eq(web3.utils.toBN(JUNE_1ST_UTC))) {
    return web3.utils.toBN(0);
  } else {
    if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JUNE_16TH_UTC))) {
      return conditionalSwap(web3.utils.toBN(50), currentTotalETH);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JULY_1ST_UTC))) {
      return conditionalSwap(web3.utils.toBN(40), currentTotalETH);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JULY_16TH_UTC))) {
      return conditionalSwap(web3.utils.toBN(30), currentTotalETH);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JULY_31ST_UTC))) {
      return conditionalSwap(web3.utils.toBN(20), currentTotalETH);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(AUG_15TH_UTC))) {
      return conditionalSwap(web3.utils.toBN(10), currentTotalETH);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(AUG_30TH_UTC))) {
      return web3.utils.toBN(0);
    } else {
      return web3.utils.toBN(0);
    }
  }
}

const conditionalSwap = (bonus, currentTotalETH) => {
  let below200K = (web3.utils.toBN(currentTotalETH).lt(web3.utils.toBN(toWei('200000', 'ether'))));
  let below400K = (web3.utils.toBN(currentTotalETH).lt(web3.utils.toBN(toWei('400000', 'ether'))));
  let below700K = (web3.utils.toBN(currentTotalETH).lt(web3.utils.toBN(toWei('700000', 'ether'))));
  let below1100K = (web3.utils.toBN(currentTotalETH).lt(web3.utils.toBN(toWei('1100000', 'ether'))));
  let below1600K = (web3.utils.toBN(currentTotalETH).lt(web3.utils.toBN(toWei('1600000', 'ether'))));
  let below2200K = (web3.utils.toBN(currentTotalETH).lt(web3.utils.toBN(toWei('2200000', 'ether'))));
  // For each condition, we take the minimum of the two bonuses
  if (below200K) {
    return (bonus.lte(web3.utils.toBN(50)))
      ? bonus
      : web3.utils.toBN(50);
  } else if (below400K) {
    return (bonus.lte(web3.utils.toBN(40)))
      ? bonus
      : web3.utils.toBN(40);
  } else if (below700K) {
    return (bonus.lte(web3.utils.toBN(30)))
      ? bonus
      : web3.utils.toBN(30);
  } else if (below1100K) {
    return (bonus.lte(web3.utils.toBN(20)))
      ? bonus
      : web3.utils.toBN(20);
  } else if (below1600K) {
    return (bonus.lte(web3.utils.toBN(10)))
      ? bonus
      : web3.utils.toBN(10);
  } else if (below2200K) {
    return web3.utils.toBN(0);
  } else {
    return web3.utils.toBN(0);
  }
}
