let gameState = {
  players: [],
  cards: {},
  zones: {},
  cardInstances: {} // Tracks attachments, tokens, modified stats
};

// Load game data
async function loadGame() {
  const res = await fetch('data.json');
  const data = await res.json();

  gameState.cards = Object.fromEntries(data.cards.map(c => [c.id, { ...c }]));
  gameState.players = data.players;
  gameState.zones = JSON.parse(JSON.stringify(data.zones)); // deep copy

  // Create card instances (mutable)
  for (const [zone, cardIds] of Object.entries(gameState.zones)) {
    cardIds.forEach(cardId => {
      const instanceId = `${cardId}_${Date.now()}_${Math.random()}`;
      gameState.cardInstances[instanceId] = {
        baseId: cardId,
        ...gameState.cards[cardId],
        zone,
        owner: null,
        tokens: [],
        attachments: [],
        attack: gameState.cards[cardId].attack || 0,
        health: gameState.cards[cardId].health || 0
      };
      if (zone === 'hand') {
        gameState.cardInstances[instanceId].owner = 1; // assign to player 1 for demo
      }
    });
  }

  renderBoard();
  setupDragDrop();
}

// Save game state
function saveGame() {
  const saveData = {
    players: gameState.players,
    zones: gameState.zones,
    cardInstances: Object.values(gameState.cardInstances).map(c => ({
      id: c.baseId,
      zone: c.zone,
      health: c.health,
      tokens: c.tokens,
      attachments: c.attachments.length
    }))
  };
  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game-save.json';
  a.click();
}

// Render all zones
function renderBoard() {
  document.querySelectorAll('.zone').forEach(zoneEl => {
    const zoneName = zoneEl.dataset.zone;
    zoneEl.innerHTML = '';

    const cardIds = gameState.zones[zoneName] || [];
    cardIds.forEach(baseId => {
      const instance = Object.values(gameState.cardInstances).find(ci => ci.baseId === baseId && ci.zone === zoneName);
      if (!instance) return;

      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.dataset.instance = Object.keys(gameState.cardInstances).find(k => gameState.cardInstances[k] === instance);
      cardEl.innerHTML = `
        <div class="name">${instance.name}</div>
        <div class="text">${instance.text || ''}</div>
        <div class="stats">
          <span>⚔️ ${instance.attack}</span>
          <span>❤️ ${instance.health}</span>
        </div>
      `;

      // Add tokens
      instance.tokens.forEach(t => {
        const token = document.createElement('div');
        token.className = 'token';
        token.textContent = t.value;
        cardEl.appendChild(token);
      });

      zoneEl.appendChild(cardEl);
    });
  });

  // Update player health
  gameState.players.forEach(p => {
    document.querySelector(`.player-area[data-player="${p.id}"] .health`).textContent = p.health;
  });
}

// Drag & Drop
function setupDragDrop() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', e.target.dataset.instance);
    });
  });

  document.querySelectorAll('.zone').forEach(zone => {
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const instanceId = e.dataTransfer.getData('text/plain');
      const instance = gameState.cardInstances[instanceId];
      if (!instance) return;

      const newZone = e.target.closest('.zone').dataset.zone;
      const oldZone = instance.zone;

      // Move in state
      gameState.zones[oldZone] = gameState.zones[oldZone].filter(id => id !== instance.baseId);
      gameState.zones[newZone].push(instance.baseId);
      instance.zone = newZone;

      renderBoard();
      setupDragDrop(); // rebind events
    });
  });
}

// Add Token (example: +1 attack)
function addToken(instanceId, type, value) {
  gameState.cardInstances[instanceId].tokens.push({ type, value });
  renderBoard();
  setupDragDrop();
}

// Attach card (e.g., enchantment)
function attachCard(parentId, childId) {
  const parent = gameState.cardInstances[parentId];
  const child = gameState.cardInstances[childId];
  child.zone = 'attached';
  parent.attachments.push(child);
  child.attachedTo = parentId;
  renderBoard();
}
