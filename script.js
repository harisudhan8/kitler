document.addEventListener('DOMContentLoaded', () => {
    // DOM element references
    const gameBoard = document.getElementById('game-board');
    const gameMessages = document.getElementById('game-messages');
    const resetGameBtn = document.getElementById('reset-game-btn');
    const shootModeBtn = document.getElementById('shoot-mode-btn');
    const generateNumberBtn = document.getElementById('generate-number-btn');
    const winDanceContainer = document.getElementById('win-dance-container');
    const setupModal = document.getElementById('setup-modal');
    const numPlayersInput = document.getElementById('num-players');
    const playerNamesContainer = document.getElementById('player-names-container');
    const startGameBtn = document.getElementById('start-game-btn');

    // Character stages
    const characterStages = [
        { name: 'empty', image: 'assests/empty.jpg' },
        { name: 'head', image: 'assests/stage1.jpg' },
        { name: 'body', image: 'assests/stage2.jpg' },
        { name: 'hands', image: 'assests/stage3.jpg' },
        { name: 'costume', image: 'assests/stage4.jpg' },
        { name: 'gun', image: 'assests/stage5.jpg' },
        { name: 'bullets', image: 'assests/stage6.jpg' }
    ];

    // Effect images and video
    const effectImages = {
        shoot_effect: 'assests/shoot.jpg',
        blast: 'assests/blast.jpg',
        eliminated: 'assests/stage7.jpg',
        win_dance: 'assests/win_dance.mp4'
    };

    // Game state
    let cells = [];
    let numberCells = [];
    let players = [];
    let shootMode = false;
    let selectedShooterCellIndex = null;
    let currentPlayerIndex = 0;
    const ODD_NUMBERS_POOL = [1, 3, 5, 7, 9];
    let activeOddNumbers = [];

    // Setup modal logic
    function updatePlayerNameInputs() {
        const num = parseInt(numPlayersInput.value);
        playerNamesContainer.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const div = document.createElement('div');
            div.classList.add('mb-2');
            div.innerHTML = `
                <label for="player-name-${i}" class="block text-gray-700 text-sm font-bold mb-1">Player ${i + 1} Name:</label>
                <input type="text" id="player-name-${i}" placeholder="Player ${i + 1}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
            `;
            playerNamesContainer.appendChild(div);
        }
    }

    numPlayersInput.addEventListener('input', updatePlayerNameInputs);

    startGameBtn.addEventListener('click', () => {
        const num = parseInt(numPlayersInput.value);
        if (num < 2 || num > 5) {
            updateGameMessage('Please select between 2 and 5 players.');
            return;
        }
        players = [];
        for (let i = 0; i < num; i++) {
            const nameInput = document.getElementById(`player-name-${i}`);
            let playerName = nameInput.value.trim() || `Player ${i + 1}`;
            players.push({ id: i, name: playerName, hasActiveCharacters: true });
        }
        setupModal.style.display = 'none';
        initializeBoard(num);
        updateGameMessage(`${players[currentPlayerIndex].name}'s turn. Click "Generate Number" to build your character!`);
    });

    // Initialize the game board
    function initializeBoard(numPlayers) {
        gameBoard.innerHTML = '';
        cells = [];
        numberCells = [];
        activeOddNumbers = [...ODD_NUMBERS_POOL];
        gameBoard.style.gridTemplateColumns = `minmax(80px, 100px) repeat(${numPlayers}, minmax(120px, 1fr))`;

        // Create numbers column
        const numbersColumn = document.createElement('div');
        numbersColumn.classList.add('numbers-column');
        const numbersHeader = document.createElement('div');
        numbersHeader.classList.add('player-column-header');
        numbersHeader.textContent = 'Numbers';
        numbersColumn.appendChild(numbersHeader);

        activeOddNumbers.forEach((oddNum) => {
            const numberCell = document.createElement('div');
            numberCell.classList.add('number-cell');
            numberCell.dataset.oddNumber = oddNum;
            const numberText = document.createElement('span');
            numberText.textContent = oddNum;
            numberCell.appendChild(numberText);
            numbersColumn.appendChild(numberCell);
            numberCells.push({ element: numberCell, oddNumber: oddNum });
        });
        gameBoard.appendChild(numbersColumn);

        // Create player columns
        for (let p = 0; p < numPlayers; p++) {
            const playerColumn = document.createElement('div');
            playerColumn.classList.add('player-column');
            playerColumn.dataset.playerIndex = p;
            const columnHeader = document.createElement('div');
            columnHeader.classList.add('player-column-header');
            columnHeader.textContent = players[p].name;
            playerColumn.appendChild(columnHeader);

            activeOddNumbers.forEach((oddNum) => {
                const cellElement = document.createElement('div');
                cellElement.classList.add('game-cell');
                cellElement.dataset.playerIndex = p;
                cellElement.dataset.oddNumber = oddNum;
                cellElement.dataset.cellId = `${p}-${oddNum}`;

                const oddNumberDisplay = document.createElement('div');
                oddNumberDisplay.classList.add('absolute', 'top-2', 'right-2', 'bg-black', 'bg-opacity-50', 'text-white', 'text-xs', 'px-2', 'py-1', 'rounded-md', 'z-20');
                oddNumberDisplay.textContent = `Odd: ${oddNum}`;
                cellElement.appendChild(oddNumberDisplay);

                const mainImage = document.createElement('img');
                mainImage.src = characterStages[0].image;
                mainImage.alt = characterStages[0].name;
                cellElement.appendChild(mainImage);

                const overlayImage = document.createElement('img');
                overlayImage.classList.add('overlay-image');
                overlayImage.style.display = 'none';
                cellElement.appendChild(overlayImage);

                playerColumn.appendChild(cellElement);

                cells.push({
                    element: cellElement,
                    mainImage: mainImage,
                    overlayImage: overlayImage,
                    playerIndex: p,
                    oddNumber: oddNum,
                    currentStageIndex: 0,
                    bullets: 0,
                    isEliminated: false
                });

                cellElement.addEventListener('click', handleCellClick);
            });
            gameBoard.appendChild(playerColumn);
        }

        winDanceContainer.style.display = 'none';
        shootMode = false;
        selectedShooterCellIndex = null;
        shootModeBtn.textContent = 'Toggle Shoot Mode';
        shootModeBtn.classList.remove('bg-yellow-500');
        shootModeBtn.classList.add('bg-blue-500');
        updateAllCellStyles();
    }

    // Update cell visual
    function updateCellVisual(cellData) {
        const { element, mainImage, overlayImage, currentStageIndex, isEliminated, bullets } = cellData;
        if (isEliminated) {
            mainImage.src = effectImages.eliminated;
            mainImage.alt = 'eliminated';
            element.classList.add('eliminated');
            overlayImage.style.display = 'none';
            return;
        }

        mainImage.src = characterStages[currentStageIndex].image;
        mainImage.alt = characterStages[currentStageIndex].name;

        if (currentStageIndex === 6 && bullets > 0) {
            overlayImage.src = characterStages[6].image;
            overlayImage.alt = `${bullets} bullets`;
            overlayImage.classList.add('bullets-overlay');
            overlayImage.style.display = 'block';
            overlayImage.classList.add('active');
        } else {
            overlayImage.style.display = 'none';
            overlayImage.classList.remove('bullets-overlay', 'active');
        }
    }

    // Update game message
    function updateGameMessage(message) {
        gameMessages.textContent = message;
    }

    // Apply visual effect
    function applyEffect(cellData, effectType) {
        const { overlayImage } = cellData;
        overlayImage.src = effectImages[effectType];
        overlayImage.alt = effectType;
        overlayImage.classList.remove('bullets-overlay');
        overlayImage.style.display = 'block';
        overlayImage.classList.add('active', `${effectType}-animation`);
        setTimeout(() => {
            overlayImage.classList.remove(`${effectType}-animation`, 'active');
            overlayImage.style.display = 'none';
            updateCellVisual(cellData);
        }, effectType === 'shoot_effect' ? 300 : 400);
    }

    // Highlight drawn number
    function highlightNumber(oddNumber) {
        numberCells.forEach(cell => {
            cell.element.classList.remove('highlighted');
            if (parseInt(cell.oddNumber) === oddNumber) {
                cell.element.classList.add('highlighted');
                setTimeout(() => cell.element.classList.remove('highlighted'), 1000);
            }
        });
    }

    // Check win condition
    function checkWinCondition() {
        const winner = players.find(player => 
            cells.some(cell => 
                cell.playerIndex === player.id && 
                cell.currentStageIndex >= 5 && 
                !cell.isEliminated
            )
        );
        if (winner) {
            updateGameMessage(`${winner.name} wins by completing a character to the gun stage!`);
            playWinAnimation();
            return true;
        }
        players.forEach(player => {
            const playerActiveCells = cells.filter(cell => 
                cell.playerIndex === player.id && !cell.isEliminated
            );
            player.hasActiveCharacters = playerActiveCells.length > 0;
        });
        const activePlayers = players.filter(player => player.hasActiveCharacters);
        if (activePlayers.length <= 1 && activePlayers.length > 0) {
            updateGameMessage(`${activePlayers[0].name} wins by eliminating all opponents!`);
            playWinAnimation();
            return true;
        } else if (activePlayers.length === 0) {
            updateGameMessage('All players eliminated! It\'s a draw.');
            return true;
        }
        return false;
    }

    // Play win animation
    function playWinAnimation() {
        winDanceContainer.innerHTML = `
            <video autoplay loop muted playsinline>
                <source src="${effectImages.win_dance}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
        winDanceContainer.style.display = 'flex';
    }

    // Update cell styles
    function updateAllCellStyles() {
        cells.forEach(cellData => {
            cellData.element.classList.remove('selected', 'target-mode');
            if (shootMode && !cellData.isEliminated && cells.indexOf(cellData) !== selectedShooterCellIndex) {
                cellData.element.classList.add('target-mode');
            }
        });
        if (selectedShooterCellIndex !== null) {
            cells[selectedShooterCellIndex].element.classList.add('selected');
        }
    }

    // Advance to next turn
    function nextTurn() {
        let nextPlayerFound = false;
        const initialPlayerIndex = currentPlayerIndex;
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            const player = players[currentPlayerIndex];
            const hasActiveCells = cells.some(cell => 
                cell.playerIndex === player.id && !cell.isEliminated
            );
            if (hasActiveCells) {
                nextPlayerFound = true;
                updateGameMessage(`${player.name}'s turn. Click "Generate Number" or toggle shoot mode.`);
            }
            if (currentPlayerIndex === initialPlayerIndex && !nextPlayerFound) {
                break;
            }
        } while (!nextPlayerFound);
    }

    // Handle cell clicks (shoot mode)
    function handleCellClick(event) {
        if (!shootMode) {
            updateGameMessage('Click "Generate Number" to build your character or toggle shoot mode.');
            return;
        }
        const clickedCellElement = event.currentTarget;
        const clickedCellIndex = cells.findIndex(cell => cell.element === clickedCellElement);
        const clickedCellData = cells[clickedCellIndex];

        if (clickedCellData.isEliminated) {
            updateGameMessage(`${players[clickedCellData.playerIndex].name}'s character (Odd: ${clickedCellData.oddNumber}) is eliminated!`);
            return;
        }

        if (selectedShooterCellIndex !== null && selectedShooterCellIndex !== clickedCellIndex) {
            const shooterCellData = cells[selectedShooterCellIndex];
            if (clickedCellData.playerIndex === shooterCellData.playerIndex) {
                updateGameMessage("You cannot shoot your own character!");
                return;
            }
            if (shooterCellData.currentStageIndex === 6 && shooterCellData.bullets > 0) {
                updateGameMessage(`${players[shooterCellData.playerIndex].name}'s character (Odd: ${shooterCellData.oddNumber}) shoots and eliminates ${players[clickedCellData.playerIndex].name}'s character (Odd: ${clickedCellData.oddNumber})!`);
                applyEffect(shooterCellData, 'shoot_effect');
                applyEffect(clickedCellData, 'blast');
                clickedCellData.isEliminated = true;
                shooterCellData.bullets--;
                if (shooterCellData.bullets === 0) {
                    shooterCellData.currentStageIndex = 5;
                }
                updateCellVisual(shooterCellData);
                updateCellVisual(clickedCellData);
                shootMode = false;
                selectedShooterCellIndex = null;
                shootModeBtn.textContent = 'Toggle Shoot Mode';
                shootModeBtn.classList.remove('bg-yellow-500');
                shootModeBtn.classList.add('bg-blue-500');
                updateAllCellStyles();
                if (checkWinCondition()) return;
                nextTurn();
            } else {
                updateGameMessage('Selected character has no bullets to shoot!');
                selectedShooterCellIndex = null;
                updateAllCellStyles();
            }
        } else if (selectedShooterCellIndex === clickedCellIndex) {
            selectedShooterCellIndex = null;
            updateGameMessage('Shoot mode active. Click a character with bullets to select as shooter.');
            updateAllCellStyles();
        } else {
            if (clickedCellData.playerIndex === players[currentPlayerIndex].id) {
                if (clickedCellData.currentStageIndex === 6 && clickedCellData.bullets > 0) {
                    selectedShooterCellIndex = clickedCellIndex;
                    updateGameMessage(`${players[clickedCellData.playerIndex].name}'s character (Odd: ${clickedCellData.oddNumber}) selected as shooter (${clickedCellData.bullets} bullets left). Click a target.`);
                    updateAllCellStyles();
                    clickedCellElement.classList.add('selected');
                } else {
                    updateGameMessage(`${players[clickedCellData.playerIndex].name}'s character (Odd: ${clickedCellData.oddNumber}) has no bullets to shoot.`);
                }
            } else {
                updateGameMessage(`It's ${players[currentPlayerIndex].name}'s turn. Select one of their own characters with bullets to shoot.`);
            }
        }
    }

    // Handle "Generate Number" button
    generateNumberBtn.addEventListener('click', () => {
        if (shootMode) {
            updateGameMessage('Exit shoot mode to generate a number.');
            return;
        }
        const randomOdd = activeOddNumbers[Math.floor(Math.random() * activeOddNumbers.length)];
        highlightNumber(randomOdd);
        const currentPlayerCells = cells.filter(cell => 
            cell.playerIndex === players[currentPlayerIndex].id && !cell.isEliminated
        );
        const targetCell = currentPlayerCells.find(cell => cell.oddNumber === randomOdd);
        if (targetCell && targetCell.currentStageIndex < 6) {
            targetCell.currentStageIndex++;
            if (targetCell.currentStageIndex === 6) {
                targetCell.bullets = 3;
                updateGameMessage(`${players[currentPlayerIndex].name} spun ${randomOdd} and gained 3 bullets for their character (Odd: ${randomOdd})!`);
            } else {
                updateGameMessage(`${players[currentPlayerIndex].name} spun ${randomOdd} and advanced their character (Odd: ${randomOdd}) to stage ${targetCell.currentStageIndex + 1}!`);
            }
            updateCellVisual(targetCell);
            if (checkWinCondition()) return;
        } else if (targetCell && targetCell.currentStageIndex === 6) {
            updateGameMessage(`${players[currentPlayerIndex].name} spun ${randomOdd}, but their character (Odd: ${randomOdd}) already has bullets (${targetCell.bullets} left)!`);
        } else {
            updateGameMessage(`${players[currentPlayerIndex].name} spun ${randomOdd}, but no progress was made.`);
        }
        nextTurn();
    });

    // Reset game
    resetGameBtn.addEventListener('click', () => {
        currentPlayerIndex = 0;
        setupModal.style.display = 'flex';
        updatePlayerNameInputs();
    });

    // Toggle shoot mode
    shootModeBtn.addEventListener('click', () => {
        const currentPlayerHasBullets = cells.some(cell => 
            cell.playerIndex === players[currentPlayerIndex].id && 
            !cell.isEliminated && 
            cell.currentStageIndex === 6 && 
            cell.bullets > 0
        );
        if (currentPlayerHasBullets) {
            shootMode = !shootMode;
            if (shootMode) {
                shootModeBtn.textContent = 'Exit Shoot Mode';
                shootModeBtn.classList.remove('bg-blue-500');
                shootModeBtn.classList.add('bg-yellow-500');
                updateGameMessage(`${players[currentPlayerIndex].name}'s turn. Shoot mode active. Select a character with bullets, then a target.`);
                selectedShooterCellIndex = null;
            } else {
                shootModeBtn.textContent = 'Toggle Shoot Mode';
                shootModeBtn.classList.remove('bg-yellow-500');
                shootModeBtn.classList.add('bg-blue-500');
                updateGameMessage(`${players[currentPlayerIndex].name}'s turn. Click "Generate Number" or toggle shoot mode.`);
                selectedShooterCellIndex = null;
            }
            updateAllCellStyles();
        } else {
            updateGameMessage(`${players[currentPlayerIndex].name} needs at least one character with bullets to enter shoot mode.`);
        }
    });

    // Initialize setup modal
    updatePlayerNameInputs();
    setupModal.style.display = 'flex';
});