let web3;
let contract;
let account;

const CONTRACT_ADDRESS = '0x69cf5d2C203aEaaFeEc504540C46f0975f9c74d0';
const walletStatus = document.getElementById('wallet-status');
const contractStatus = document.getElementById('contract-status');

async function initializeContract() {
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        account = accounts[0];
        updateWalletStatus(true);

        // Initialize Web3
      web3 = new Web3(window.ethereum);
        
        // Load contract ABI
        const response = await fetch('LandRegistry.json');
        const contractJson = await response.json();
        
        // Initialize contract
        contract = new web3.eth.Contract(contractJson.abi, CONTRACT_ADDRESS);
        
        // Verify contract connection
        await contract.methods.propertyCounter().call();
        updateContractStatus(true);

        // Set up event listeners for account and network changes
        window.ethereum.on('accountsChanged', handleAccountChange);
        window.ethereum.on('chainChanged', () => window.location.reload());

        console.log('Contract initialized successfully');
    } catch (error) {
        console.error('Contract initialization failed:', error);
        handleInitializationError(error);
    }
}

function updateWalletStatus(isConnected) {
    walletStatus.innerHTML = isConnected 
        ? `🟢 Connected: ${shortenAddress(account)}`
        : '🔴 Wallet not connected';
    walletStatus.className = `status-indicator ${isConnected ? 'connected' : 'disconnected'}`;
}

function updateContractStatus(isConnected) {
    contractStatus.innerHTML = isConnected
        ? '🟢 Contract connected'
        : '🔴 Contract not connected';
    contractStatus.className = `status-indicator ${isConnected ? 'connected' : 'disconnected'}`;
}

async function handleAccountChange(accounts) {
    if (accounts.length === 0) {
        // User disconnected wallet
        account = null;
        updateWalletStatus(false);
        updateContractStatus(false);
    } else {
        account = accounts[0];
        updateWalletStatus(true);
    }
}

function handleInitializationError(error) {
    if (error.message.includes('MetaMask')) {
        updateWalletStatus(false);
    } else if (error.message.includes('contract')) {
        updateContractStatus(false);
    }
    alert(`Error: ${error.message}`);
}

function shortenAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Initialize contract when page loads
document.addEventListener('DOMContentLoaded', initializeContract);

async function registerProperty() {
  const ownerAddress = document.getElementById("ownerAddress").value;
  const propertyType = document.getElementById("propertyType").value;
  const address = document.getElementById("address").value;
  const size = document.getElementById("size").value;
  const bedrooms = document.getElementById("bedrooms").value;
  const bathrooms = document.getElementById("bathrooms").value;
  const constructionYear = document.getElementById("constructionYear").value;
  const amenities = document.getElementById("amenities").value.split(',').map(item => item.trim());

  if (!ownerAddress || !propertyType || !address || !size || !bedrooms || !bathrooms || !constructionYear) {
    return alert("Please fill all required fields");
  }

  try {
    await contract.methods.registerProperty(
      propertyType,
      address,
      size,
      bedrooms,
      bathrooms,
      constructionYear,
      amenities.join(', ') // Convert array back to string
    ).send({ from: ownerAddress });
    alert("Property registered successfully!");
    document.getElementById("ownerAddress").value = "";
    document.getElementById("propertyType").value = "House";
    document.getElementById("address").value = "";
    document.getElementById("size").value = "";
    document.getElementById("bedrooms").value = "";
    document.getElementById("bathrooms").value = "";
    document.getElementById("constructionYear").value = "";
    document.getElementById("amenities").value = "";
  } catch (error) {
    console.error("Registration error:", error);
    alert("Error registering property: " + error.message);
  }
}

async function updateValuation() {
  const propertyId = document.getElementById("propertyId").value;
  const valuation = document.getElementById("valuation").value;

  if (!propertyId || !valuation) return alert("Fill all fields");

  try {
    // Convert ETH to Wei before sending to contract
    const valuationInWei = web3.utils.toWei(valuation.toString(), 'ether');
    await contract.methods.updateValuation(propertyId, valuationInWei).send({ from: account });
    alert("Valuation updated successfully!");
    loadPropertyDetails(propertyId);
  } catch (error) {
    console.error("Valuation update error:", error);
    alert("Error updating valuation: " + error.message);
  }
}

async function setForSale() {
  const propertyId = document.getElementById("propertyId").value;
  const price = document.getElementById("price").value;

  if (!propertyId || !price) return alert("Fill all fields");

  try {
    // Convert ETH to Wei before sending to contract
    const priceInWei = web3.utils.toWei(price.toString(), 'ether');
    await contract.methods.setForSale(propertyId, priceInWei).send({ from: account });
    alert("Property set for sale successfully!");
    loadPropertyDetails(propertyId);
  } catch (error) {
    console.error("Set for sale error:", error);
    alert("Error setting property for sale: " + error.message);
  }
}

async function addDocument() {
  const propertyId = document.getElementById("propertyId").value;
  const documentHash = document.getElementById("documentHash").value;

  if (!propertyId || !documentHash) return alert("Fill all fields");

  try {
    await contract.methods.addDocument(propertyId, documentHash).send({ from: account });
    alert("Document added successfully!");
    loadPropertyDetails(propertyId);
  } catch (error) {
    console.error("Add document error:", error);
    alert("Error adding document: " + error.message);
  }
}

async function verifyProperty() {
  const propertyId = document.getElementById("propertyId").value;
  if (!propertyId) return alert("Enter property ID");

  try {
    await contract.methods.verifyProperty(propertyId).send({ from: account });
    alert("Property verified successfully!");
    loadPropertyDetails(propertyId);
  } catch (error) {
    console.error("Verification error:", error);
    alert("Error verifying property: " + error.message);
  }
}

async function transferProperty() {
  const propertyId = document.getElementById("propertyId").value;
  const newOwner = document.getElementById("newOwner").value;

  if (!propertyId || !newOwner) return alert("Fill all fields");

  try {
    await contract.methods.transferProperty(propertyId, newOwner).send({ from: account });
    alert("Property transferred successfully!");
    loadMyProperties();
  } catch (error) {
    console.error("Transfer error:", error);
    alert("Error transferring property: " + error.message);
  }
}

async function raiseDispute(propertyId) {
  console.log('Raising dispute for property:', propertyId);
  
  // Try to get the textarea using the property-specific ID
  const reasonTextarea = document.getElementById(`disputeReason-${propertyId}`);
  console.log('Found textarea:', reasonTextarea);
  
  if (!reasonTextarea) {
    console.error(`Dispute reason textarea not found for property ${propertyId}`);
    alert("Error: Could not find the dispute form. Please try again.");
    return;
  }

  const reason = reasonTextarea.value.trim();
  console.log('Dispute reason:', reason);

  if (!reason) {
    alert("Please provide a reason for the dispute");
    return;
  }

  try {
    const disputeBtn = document.querySelector('.dispute-btn');
    if (disputeBtn) {
      disputeBtn.disabled = true;
      disputeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Raising Dispute...';
    }

    console.log('Sending dispute to contract with reason:', reason);
    await contract.methods.raiseDispute(propertyId, reason).send({ from: account });
    
    alert("Dispute raised successfully!");
    reasonTextarea.value = "";
    
    // Refresh the disputes list
    await loadPropertyDisputes(propertyId);
  } catch (error) {
    console.error("Raise dispute error:", error);
    alert("Error raising dispute: " + error.message);
  } finally {
    const disputeBtn = document.querySelector('.dispute-btn');
    if (disputeBtn) {
      disputeBtn.disabled = false;
      disputeBtn.innerHTML = '<i class="fas fa-gavel"></i> Raise Dispute';
    }
  }
}

async function loadMyProperties() {
  try {
    const properties = await contract.methods.getMyProperties().call({ from: account });
    const propertiesList = document.getElementById("propertiesList");
    propertiesList.innerHTML = "";

    if (properties.length === 0) {
      propertiesList.innerHTML = "<p>No properties found</p>";
      return;
    }

    const list = document.createElement("ul");
    properties.forEach(propertyId => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="property-item">
          <span>Property ID: ${propertyId}</span>
          <button onclick="loadPropertyDetails(${propertyId})">View Details</button>
        </div>
      `;
      list.appendChild(li);
    });
    propertiesList.appendChild(list);
  } catch (error) {
    console.error("Load properties error:", error);
    alert("Error loading properties: " + error.message);
  }
}

async function loadPropertyDetails(propertyId) {
  try {
    // Switch to the combined section and details tab
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('combined').classList.add('active');
    
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="details"]').classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('details-content').classList.add('active');

    const propertyDetails = document.getElementById("propertyDetails");
    propertyDetails.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading property details...</p>
      </div>
    `;

    const details = await contract.methods.getPropertyDetails(propertyId).call({ from: account });
    
    propertyDetails.innerHTML = `
      <div class="details-card">
        <div class="details-header">
          <div class="details-title">
            <h2>Property #${propertyId}</h2>
            <span class="status-badge ${details.status.toLowerCase().replace(/\s+/g, '-')}">
              <i class="fas ${getStatusIcon(details.status)}"></i>
              ${details.status}
            </span>
          </div>
          ${details.isVerified ? 
            `<div class="verified-tag">
              <i class="fas fa-check-circle"></i> Verified Property
            </div>` : ''}
        </div>

        <div class="details-content">
          <div class="details-section">
            <h3><i class="fas ${getPropertyTypeIcon(details.propertyType)}"></i> Basic Information</h3>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Type</span>
                <span class="detail-value">${details.propertyType}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Size</span>
                <span class="detail-value">${details.size} sqft</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Bedrooms</span>
                <span class="detail-value">${details.bedrooms}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Bathrooms</span>
                <span class="detail-value">${details.bathrooms}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Construction Year</span>
                <span class="detail-value">${details.constructionYear}</span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
            <p class="property-full-address">${details.propertyAddress}</p>
          </div>

          <div class="details-section">
            <h3><i class="fas fa-tag"></i> Pricing Information</h3>
            <div class="pricing-grid">
              <div class="price-card">
                <span class="price-label">Current Valuation</span>
                <span class="price-value">${web3.utils.fromWei(details.valuation, 'ether')} ETH</span>
              </div>
              ${details.isForSale ? `
                <div class="price-card sale-price">
                  <span class="price-label">Listed For Sale</span>
                  <span class="price-value">${web3.utils.fromWei(details.salePrice, 'ether')} ETH</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="details-section">
            <h3><i class="fas fa-list"></i> Amenities</h3>
            <div class="amenities-list">
              ${details.amenities.split(',').map(amenity => `
                <span class="amenity-tag">${amenity.trim()}</span>
              `).join('')}
            </div>
          </div>

          ${details.documents.length > 0 ? `
            <div class="details-section">
              <h3><i class="fas fa-file-alt"></i> Documents</h3>
              <div class="documents-list">
                ${details.documents.map(doc => `
                  <div class="document-item">
                    <i class="fas fa-file-pdf"></i>
                    <span>${doc}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="details-section" id="dispute-section-${propertyId}">
            <h3><i class="fas fa-exclamation-triangle"></i> Raise Dispute</h3>
            <div class="dispute-form">
              <div class="form-group">
                <label for="disputeReason-${propertyId}">Reason for Dispute</label>
                <textarea 
                  id="disputeReason-${propertyId}" 
                  class="dispute-reason-input" 
                  placeholder="Enter the reason for raising a dispute..." 
                  rows="4"
                  onchange="console.log('Textarea changed:', this.value)"
                ></textarea>
              </div>
              <button 
                type="button"
                class="dispute-btn"
                onclick="(async () => { await raiseDispute('${propertyId}'); })()"
              >
                <i class="fas fa-gavel"></i> Raise Dispute
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load history and disputes
    await loadPropertyHistory(propertyId);
    await loadPropertyDisputes(propertyId);
  } catch (error) {
    console.error("Load details error:", error);
    propertyDetails.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error Loading Property Details</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function loadPropertyHistory(propertyId) {
  try {
    const history = await contract.methods.getPropertyHistory(propertyId).call({ from: account });
    const propertyHistory = document.getElementById("propertyHistory");
    
    if (!history || !history.previousOwners || history.previousOwners.length === 0) {
      propertyHistory.innerHTML = `
        <div class="no-history">
          <i class="fas fa-history"></i>
          <p>No ownership history available</p>
        </div>
      `;
      return;
    }

    propertyHistory.innerHTML = `
      <div class="history-card">
        <div class="history-header">
          <h3><i class="fas fa-history"></i> Ownership Timeline</h3>
        </div>
        <div class="timeline">
          ${history.previousOwners.map((owner, index) => `
            <div class="timeline-item">
              <div class="timeline-point"></div>
              <div class="timeline-content">
                <div class="transfer-details">
                  <div class="transfer-header">
                    <span class="transfer-date">
                      ${new Date(history.transferDates[index] * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span class="transfer-price">
                      ${web3.utils.fromWei(history.prices[index].toString(), 'ether')} ETH
                    </span>
                  </div>
                  <div class="owner-address">
                    <i class="fas fa-user"></i>
                    ${shortenAddress(owner)}
                  </div>
                  ${history.transferReasons[index] ? `
                    <div class="transfer-reason">
                      <i class="fas fa-info-circle"></i>
                      ${history.transferReasons[index]}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Load history error:", error);
    propertyHistory.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error Loading Property History</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function loadPropertyDisputes(propertyId) {
  try {
    const disputes = await contract.methods.getPropertyDisputes(propertyId).call({ from: account });
    const propertyDisputes = document.getElementById("propertyDisputes");
    
    propertyDisputes.innerHTML = `
      <div class="disputes-card">
        <div class="disputes-header">
          <h3><i class="fas fa-gavel"></i> Property Disputes</h3>
        </div>
        <div class="disputes-content">
          ${disputes.length === 0 ? 
            `<div class="no-disputes">
              <i class="fas fa-check-circle"></i>
              <p>No disputes found for this property</p>
            </div>` :
            `<div class="disputes-list">
              ${disputes.map(dispute => `
                <div class="dispute-item">
                  <div class="dispute-header">
                    <div class="dispute-complainant">
                      <i class="fas fa-user"></i>
                      <span>${shortenAddress(dispute.complainant)}</span>
                    </div>
                    <span class="dispute-status ${dispute.isResolved ? 'resolved' : 'pending'}">
                      ${dispute.isResolved ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                  <div class="dispute-reason">
                    <i class="fas fa-quote-left"></i>
                    <p>${dispute.reason}</p>
                  </div>
                  ${dispute.isResolved ? 
                    `<div class="dispute-resolution">
                      <i class="fas fa-check-circle"></i>
                      <p>${dispute.resolution}</p>
                    </div>` : ''}
                </div>
          `).join('')}
            </div>`
          }
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Load disputes error:", error);
    propertyDisputes.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error Loading Disputes</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function removeDocument() {
  const propertyId = document.getElementById("propertyId").value;
  const documentHash = document.getElementById("documentHash").value;

  if (!propertyId || !documentHash) return alert("Fill all fields");

  try {
    await contract.methods.removeDocument(propertyId, documentHash).send({ from: account });
    alert("Document removed successfully!");
    loadPropertyDetails(propertyId);
  } catch (error) {
    console.error("Remove document error:", error);
    alert("Error removing document: " + error.message);
  }
}

async function revertSaleStatus() {
  const propertyId = document.getElementById("propertyId").value;
  if (!propertyId) return alert("Enter property ID");

  try {
    await contract.methods.revertSaleStatus(propertyId).send({ from: account });
    alert("Sale status reverted successfully!");
    loadPropertyDetails(propertyId);
  } catch (error) {
    console.error("Revert sale status error:", error);
    alert("Error reverting sale status: " + error.message);
  }
}

// Theme toggle functionality
function toggleTheme() {
  const html = document.documentElement;
  const themeToggle = document.querySelector(".theme-toggle i");
  
  if (html.getAttribute("data-theme") === "light") {
    html.setAttribute("data-theme", "dark");
    themeToggle.classList.remove("fa-sun");
    themeToggle.classList.add("fa-moon");
  } else {
    html.setAttribute("data-theme", "light");
    themeToggle.classList.remove("fa-moon");
    themeToggle.classList.add("fa-sun");
  }
}

async function searchPropertiesByOwner() {
  const ownerAddress = document.getElementById("searchOwner").value;
  if (!ownerAddress) return alert("Please enter an owner address");

  try {
    const searchResults = document.getElementById("searchResults");
    searchResults.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Searching for properties...</p>
      </div>
    `;

    const properties = await contract.methods.getPropertiesByOwner(ownerAddress).call();
    
    if (properties.length === 0) {
      searchResults.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>No Properties Found</h3>
          <p>No properties were found for the address: ${ownerAddress}</p>
        </div>
      `;
      return;
    }

    // Create grid container for property cards
    searchResults.innerHTML = `
      <div class="search-results-grid">
        ${properties.map(propertyId => `
          <div class="property-card loading" id="property-card-${propertyId}">
            <div class="property-card-loading">
              <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
              </div>
              <p>Loading property details...</p>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    // Load details for each property
    for (const propertyId of properties) {
      try {
        const details = await contract.methods.getPropertyDetails(propertyId).call();
        const card = document.getElementById(`property-card-${propertyId}`);
        if (card) {
          const statusClass = details.status.toLowerCase().replace(/\s+/g, '-');
          card.classList.remove('loading');
          card.innerHTML = `
            <div class="property-card-header">
              <div class="property-type">
                <i class="fas ${getPropertyTypeIcon(details.propertyType)}"></i>
                <span>${details.propertyType}</span>
              </div>
              <div class="property-id">#${propertyId}</div>
            </div>
            
            <div class="property-card-content">
              <div class="property-info">
                <div class="info-row">
                  <i class="fas fa-map-marker-alt"></i>
                  <p class="property-address">${details.propertyAddress}</p>
                </div>
                
                <div class="property-stats">
                  <div class="stat-item">
                    <i class="fas fa-ruler-combined"></i>
                    <span>${details.size} sqft</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-bed"></i>
                    <span>${details.bedrooms} beds</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-bath"></i>
                    <span>${details.bathrooms} baths</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Built ${details.constructionYear}</span>
                  </div>
                </div>

                <div class="property-status-row">
                  <span class="status-badge ${statusClass}">
                    <i class="fas ${getStatusIcon(details.status)}"></i>
                    ${details.status}
                  </span>
                  ${details.isVerified ? 
                    `<span class="verified-badge">
                      <i class="fas fa-check-circle"></i> Verified
                    </span>` : ''}
                </div>

                <div class="property-price-row">
                  <div class="valuation">
                    <span class="label">Valuation</span>
                    <span class="value">${web3.utils.fromWei(details.valuation, 'ether')} ETH</span>
                  </div>
                  ${details.isForSale ? 
                    `<div class="sale-price">
                      <span class="label">For Sale</span>
                      <span class="value">${web3.utils.fromWei(details.salePrice, 'ether')} ETH</span>
                    </div>` : ''}
                </div>
              </div>
            </div>

            <div class="property-card-footer">
              <button class="view-details-btn" onclick="loadPropertyDetails(${propertyId})">
                <i class="fas fa-eye"></i> View Details
              </button>
              ${details.documents.length > 0 ? 
                `<div class="documents-badge">
                  <i class="fas fa-file-alt"></i>
                  ${details.documents.length} Document${details.documents.length > 1 ? 's' : ''}
                </div>` : ''}
            </div>
          `;
        }
      } catch (error) {
        console.error(`Error loading details for property ${propertyId}:`, error);
        const card = document.getElementById(`property-card-${propertyId}`);
        if (card) {
          card.innerHTML = `
            <div class="error-state">
              <i class="fas fa-exclamation-circle"></i>
              <h3>Error Loading Property</h3>
              <p>Failed to load details for Property #${propertyId}</p>
            </div>
          `;
        }
      }
    }
  } catch (error) {
    console.error("Search error:", error);
    searchResults.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Search Error</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Helper function to get appropriate icon for property type
function getPropertyTypeIcon(propertyType) {
  switch (propertyType.toLowerCase()) {
    case 'house':
      return 'fa-home';
    case 'apartment':
      return 'fa-building';
    case 'commercial':
      return 'fa-store';
    default:
      return 'fa-building';
  }
}

// Helper function to get appropriate icon for status
function getStatusIcon(status) {
  switch (status.toLowerCase()) {
    case 'registered':
      return 'fa-file-signature';
    case 'verified':
      return 'fa-check-circle';
    case 'for sale':
      return 'fa-tag';
    default:
      return 'fa-info-circle';
  }
}