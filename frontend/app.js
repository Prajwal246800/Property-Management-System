let web3;
let contract;
let account;

const contractAddress = "0x7c9ea639A736B750F1C6C365DE2E1d529067Af7c"; // Replace after migration

// Load ABI from compiled JSON
async function initContract() {
  const response = await fetch("../build/contracts/LandRegistry.json");
  const data = await response.json();
  const contractABI = data.abi;

  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];
      contract = new web3.eth.Contract(contractABI, contractAddress);
      alert("Wallet connected: " + account);
      loadMyLands();
    } catch (error) {
      console.error("User denied access to MetaMask.");
    }
  } else {
    alert("Please install MetaMask.");
  }
}

async function registerLand() {
  const location = document.getElementById("location").value;
  const area = document.getElementById("area").value;
  if (!location || !area) return alert("Fill all fields");

  try {
    await contract.methods.registerLand(location, area).send({ from: account });
    alert("Land registered!");
    loadMyLands();
  } catch (error) {
    console.error(error);
    alert("Transaction failed.");
  }
}

async function transferLand() {
  const landId = document.getElementById("landIdTransfer").value;
  const newOwner = document.getElementById("newOwner").value;
  if (!landId || !newOwner) return alert("Fill all fields");

  try {
    await contract.methods.transferLand(landId, newOwner).send({ from: account });
    alert("Ownership transferred!");
    loadMyLands();
  } catch (error) {
    console.error(error);
    alert("Transfer failed.");
  }
}

async function loadMyLands() {
  const list = document.getElementById("landList");
  list.innerHTML = "";
  try {
    const landIds = await contract.methods.getMyLands().call({ from: account });
    for (let id of landIds) {
      const land = await contract.methods.getLandDetails(id).call();
      const li = document.createElement("li");
      li.textContent = `#${land.id} - ${land.location}, ${land.area} sqft (Owner: ${land.owner})`;
      list.appendChild(li);
    }
  } catch (error) {
    console.error(error);
    alert("Error loading lands.");
  }
}

// Auto-init when page loads
window.addEventListener("load", initContract);