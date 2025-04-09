// ==UserScript==
// @name         Chess.com Powerhouse Engine Advisor (Roma10boss Edition)
// @namespace    https://github.com/Roma10boss/chess-com-engine-advisor
// @downloadURL  https://github.com/Roma10boss/chess-com-engine-advisor/raw/main/chess-com-powerhouse-engine-advisor.user.js
// @updateURL    https://github.com/Roma10boss/chess-com-engine-advisor/raw/main/chess-com-powerhouse-engine-advisor.user.js
// @version      1.3
// @description  Show powerful combined engine analysis (Stockfish + Maia) on chess.com with improved UI and long game support
// @author       ChessHelper
// @match        https://www.chess.com/*
// @grant        GM_xmlhttpRequest
// @connect      lichess.org
// ==/UserScript==

/* 
 * IMPORTANT: Replace YOUR-USERNAME in the namespace, downloadURL and updateURL
 * with your actual GitHub username after forking the repository
 */

(function() {
    'use strict';

    // Enable debugging if needed (set to true to see detailed logs)
    const debugMode = false;
    
    // Enhanced logging function
    function log(message) {
        const now = new Date().toISOString().substring(11, 19);
        if (debugMode || message.includes('ERROR')) {
            console.log(`[Chess Powerhouse ${now}] ${message}`);
            
            // Also show critical errors in the overlay for better user feedback
            if (message.includes('ERROR')) {
                overlay.innerText = `⚠️ ${message}`;
                overlay.style.display = 'block';
            }
        }
    }

    // Create UI elements
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.bottom = '60px';
    overlay.style.right = '20px'; // Move to the right side instead of center
    overlay.style.left = 'auto'; // Remove left positioning
    overlay.style.transform = 'none'; // Remove transform
    overlay.style.width = '280px'; // Fixed width
    overlay.style.padding = '10px 16px';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.color = '#00ffcc';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize = '16px';
    overlay.style.borderRadius = '8px';
    overlay.style.zIndex = '9995'; // Lower z-index to avoid conflicts
    overlay.style.display = 'none'; // Initially hidden
    overlay.innerText = '♟ Initializing engines...';
    document.body.appendChild(overlay);

    // Material balance indicator
    const materialBalance = document.createElement('div');
    materialBalance.style.position = 'fixed';
    materialBalance.style.top = '50px';
    materialBalance.style.right = '50px'; // Move further right
    materialBalance.style.padding = '5px 10px';
    materialBalance.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    materialBalance.style.color = 'white';
    materialBalance.style.fontFamily = 'monospace';
    materialBalance.style.fontSize = '14px';
    materialBalance.style.borderRadius = '4px';
    materialBalance.style.zIndex = '9995';
    materialBalance.style.display = 'none';
    materialBalance.innerText = 'Material: +0';
    document.body.appendChild(materialBalance);

    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.style.position = 'fixed';
    statusIndicator.style.top = '10px';
    statusIndicator.style.right = '50px'; // Move further right
    statusIndicator.style.width = '10px';
    statusIndicator.style.height = '10px';
    statusIndicator.style.borderRadius = '50%';
    statusIndicator.style.backgroundColor = 'gray';
    statusIndicator.style.zIndex = '9995';
    document.body.appendChild(statusIndicator);

    // Manual refresh button
    const refreshButton = document.createElement('button');
    refreshButton.innerText = '↻';
    refreshButton.title = 'Refresh Analysis';
    refreshButton.style.position = 'fixed';
    refreshButton.style.bottom = '20px';
    refreshButton.style.right = '90px'; // Adjusted position
    refreshButton.style.zIndex = '9995';
    refreshButton.style.padding = '8px 12px';
    refreshButton.style.backgroundColor = '#2f2f2f';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.fontSize = '18px';
    refreshButton.onclick = () => {
        lastFen = ''; // Force refresh
        analyzePosition(true); // Force immediate analysis
    };
    document.body.appendChild(refreshButton);

    // Toggle button
    const toggleButton = document.createElement('button');
    toggleButton.innerText = 'Toggle Hint';
    toggleButton.style.position = 'fixed';
    toggleButton.style.bottom = '20px';
    toggleButton.style.right = '150px'; // Move further right
    toggleButton.style.zIndex = '9995';
    toggleButton.style.padding = '8px 12px';
    toggleButton.style.backgroundColor = '#2f2f2f';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '4px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.onclick = () => {
        const newDisplay = overlay.style.display === 'none' ? 'block' : 'none';
        overlay.style.display = newDisplay;
        materialBalance.style.display = newDisplay;
    };
    document.body.appendChild(toggleButton);

    // Recovery button for force reset when the script stops working
    const recoveryButton = document.createElement('button');
    recoveryButton.innerText = '🔄';
    recoveryButton.title = 'Force Reset (use if advisor stops working)';
    recoveryButton.style.position = 'fixed';
    recoveryButton.style.bottom = '20px';
    recoveryButton.style.right = '20px';
    recoveryButton.style.zIndex = '9995';
    recoveryButton.style.padding = '8px 12px';
    recoveryButton.style.backgroundColor = '#ff5722';
    recoveryButton.style.color = 'white';
    recoveryButton.style.border = 'none';
    recoveryButton.style.borderRadius = '4px';
    recoveryButton.style.cursor = 'pointer';
    recoveryButton.style.fontSize = '18px';
    recoveryButton.onclick = () => {
        // Full reset of everything
        log('Full system reset initiated by user');
        performFullReset();
    };
    document.body.appendChild(recoveryButton);

    // Engine type indicator/selector
    const engineIndicator = document.createElement('div');
    engineIndicator.innerText = '⚙️ WASM';
    engineIndicator.title = 'Current Engine: WebAssembly (click to toggle)';
    engineIndicator.style.position = 'fixed';
    engineIndicator.style.top = '10px';
    engineIndicator.style.right = '70px';
    engineIndicator.style.padding = '2px 5px';
    engineIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    engineIndicator.style.color = '#00ffcc';
    engineIndicator.style.fontFamily = 'monospace';
    engineIndicator.style.fontSize = '14px';
    engineIndicator.style.borderRadius = '4px';
    engineIndicator.style.zIndex = '9995';
    engineIndicator.style.cursor = 'pointer';
    engineIndicator.onclick = () => {
        // Toggle between engine types
        currentEngineType = currentEngineType === 'wasm' ? 'js' : 'wasm';
        engineIndicator.innerText = currentEngineType === 'wasm' ? '⚙️ WASM' : '⚙️ JS';
        engineIndicator.title = currentEngineType === 'wasm' ? 
            'Current Engine: WebAssembly (click to toggle)' : 
            'Current Engine: JavaScript (click to toggle)';
        log(`Switched to ${currentEngineType.toUpperCase()} engine`);
        
        // Reinitialize with new engine type
        if (stockfish) {
            stockfish.terminate();
            stockfish = null;
        }
        initStockfish();
        lastFen = '';
        analyzePosition(true);
    };
    document.body.appendChild(engineIndicator);

    // Powerhouse logo/indicator
    const powerhouseIndicator = document.createElement('div');
    powerhouseIndicator.innerText = '⚡';
    powerhouseIndicator.title = 'Powerhouse Mode Active';
    powerhouseIndicator.style.position = 'fixed';
    powerhouseIndicator.style.top = '10px';
    powerhouseIndicator.style.right = '30px';
    powerhouseIndicator.style.padding = '5px';
    powerhouseIndicator.style.backgroundColor = 'transparent';
    powerhouseIndicator.style.color = '#ff9800';
    powerhouseIndicator.style.fontFamily = 'monospace';
    powerhouseIndicator.style.fontSize = '20px';
    powerhouseIndicator.style.zIndex = '9995';
    document.body.appendChild(powerhouseIndicator);

    // Globals
    let stockfish = null;
    let lastFen = '';
    let isAnalyzing = false;
    let boardObserver = null;
    let yourColor = null;
    let isYourTurn = false;
    let positionHasChanged = true;
    let lastAnalysisTime = 0;
    let stockfishBestMove = null;
    let maiaBestMove = null;
    let stockfishScore = null;
    let boardDOM = null;
    let lastBoardState = null;
    let autoRefreshInterval = null;
    let connectionTimeout = null;
    let analysisAttempts = 0;
    let moveCount = 0; // Track number of moves
    let consecutiveFailures = 0; // Track consecutive analysis failures
    let currentEngineType = 'wasm'; // Default to WebAssembly engine
    const MAX_ANALYSIS_ATTEMPTS = 3;
    const MAX_CONSECUTIVE_FAILURES = 5; // Maximum consecutive failures before reset

    // Engine URL sources - using Roma10boss repositories
    const ENGINE_SOURCES = {
        // Primary sources from Roma10boss repositories
        wasm: 'https://roma10boss.github.io/stockfish.wasm/stockfish.wasm/stockfish.wasm-master/stockfish.js',
        js: 'https://roma10boss.github.io/stockfish.js/stockfish.js/stockfish.js-ddugovic/stockfish.js',
        
        // Fallback sources
        fallback1: 'https://stockfish.js.org/stockfish.js', 
        fallback2: 'https://lichess1.org/stockfish/stockfish.wasm.js'
    };

    // Function to perform a full reset of everything
    function performFullReset() {
        if (stockfish) {
            stockfish.terminate();
            stockfish = null;
        }
        
        // Reset all state variables
        lastFen = '';
        lastBoardState = null;
        moveCount = 0;
        analysisAttempts = 0;
        consecutiveFailures = 0;
        positionHasChanged = true;
        stockfishBestMove = null;
        maiaBestMove = null;
        stockfishScore = null;
        
        // Stop any existing intervals
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        
        // Reconnect observers
        if (boardObserver) {
            boardObserver.disconnect();
            boardObserver = null;
        }
        
        // Initialize everything again
        initStockfish();
        setupBoardObserver();
        
        // Visual feedback
        overlay.innerText = '⚡ Full reset initiated...';
        overlay.style.display = 'block';
        
        // Force analysis after a short delay
        setTimeout(() => analyzePosition(true), 1000);
    }

    // Piece values for material counting
    const pieceValues = {
        'p': -1, 'n': -3, 'b': -3, 'r': -5, 'q': -9, 'k': 0,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 0
    };

    // Initialize Stockfish with multiple fallback options
    function initStockfish() {
        try {
            // If we already have a Stockfish instance, terminate it
            if (stockfish) {
                stockfish.terminate();
                stockfish = null;
            }

            log(`Initializing Stockfish ${currentEngineType.toUpperCase()} engine`);
            
            // Primary source based on current engine type
            let primarySource = ENGINE_SOURCES[currentEngineType];
            let sourceName = `${currentEngineType.toUpperCase()} (Roma10boss)`;
            let initSuccess = false;
            
            try {
                stockfish = new Worker(primarySource);
                log(`Successfully loaded ${sourceName} engine`);
                initSuccess = true;
            } catch (e) {
                log(`ERROR: Failed to load primary ${sourceName} engine: ${e.message}`);
                
                // Try alternative engine type first
                const altType = currentEngineType === 'wasm' ? 'js' : 'wasm';
                const altSource = ENGINE_SOURCES[altType];
                const altSourceName = `${altType.toUpperCase()} (Roma10boss)`;
                
                try {
                    log(`Trying alternative ${altSourceName} engine...`);
                    stockfish = new Worker(altSource);
                    log(`Successfully loaded alternative ${altSourceName} engine`);
                    currentEngineType = altType; // Update current engine type
                    engineIndicator.innerText = currentEngineType === 'wasm' ? '⚙️ WASM' : '⚙️ JS';
                    initSuccess = true;
                } catch (e2) {
                    log(`ERROR: Failed to load alternative engine: ${e2.message}`);
                    
                    // Try fallback sources
                    for (let i = 1; i <= 2; i++) {
                        try {
                            const fallbackSource = ENGINE_SOURCES[`fallback${i}`];
                            log(`Trying fallback #${i}: ${fallbackSource}`);
                            stockfish = new Worker(fallbackSource);
                            log(`Successfully loaded fallback #${i} engine`);
                            initSuccess = true;
                            break;
                        } catch (fallbackError) {
                            log(`ERROR: Fallback #${i} failed: ${fallbackError.message}`);
                        }
                    }
                }
            }
            
            if (!initSuccess) {
                log('ERROR: All engine sources failed to load');
                statusIndicator.style.backgroundColor = 'red';
                overlay.innerText = '⚠️ Failed to load any engine source. Check internet connection and try the reset button (🔄).';
                overlay.style.display = 'block';
                return false;
            }

            // Set up event listener for messages from Stockfish
            stockfish.onmessage = function(event) {
                const message = event.data;

                // Clear timeout on successful communication
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }

                // Handle "bestmove" messages
                if (message.startsWith('bestmove')) {
                    const bestMove = message.split(' ')[1];
                    if (bestMove && bestMove !== '(none)') {
                        stockfishBestMove = bestMove;
                        log(`Stockfish bestmove: ${bestMove}`);
                        updateDisplay();
                    }
                }

                // Handle info messages (for score and depth)
                if (message.startsWith('info') && message.includes('score')) {
                    updateStockfishInfo(message);
                }
            };

            // Set a shorter timeout with better error handling
            connectionTimeout = setTimeout(() => {
                log('ERROR: Stockfish connection timeout - reinitializing');
                if (analysisAttempts < MAX_ANALYSIS_ATTEMPTS) {
                    analysisAttempts++;
                    initStockfish();
                } else {
                    statusIndicator.style.backgroundColor = 'red';
                    overlay.innerText = '⚠️ Engine connection failed. Press the reset button (🔄) to try again.';
                    overlay.style.display = 'block';
                }
            }, 5000);

            // Initialize engine with standard settings
            stockfish.postMessage('uci');
            stockfish.postMessage('isready');
            stockfish.postMessage('ucinewgame');

            // Set threads and hash table size for better performance
            stockfish.postMessage('setoption name Threads value 2'); // Reduced from 4 to be gentler on resources
            stockfish.postMessage('setoption name Hash value 16');   // Reduced from 32 to be gentler on resources

            statusIndicator.style.backgroundColor = 'green';
            analysisAttempts = 0; // Reset attempts on successful initialization
            consecutiveFailures = 0; // Reset failure count
            return true;
        } catch (e) {
            log(`ERROR: initializing Stockfish: ${e.message}`);
            statusIndicator.style.backgroundColor = 'red';
            return false;
        }
    }

    // Function to periodically reinitialize engines
    function periodicReinit() {
        // Reset engines every 8 moves
        if (moveCount > 0 && moveCount % 8 === 0) {
            log('Performing periodic engine reinitialization');
            if (stockfish) {
                stockfish.terminate();
                stockfish = null;
            }
            initStockfish();
        }
    }

    // Update Stockfish info display
    function updateStockfishInfo(infoLine) {
        try {
            // Extract score
            if (infoLine.includes('score cp ')) {
                const parts = infoLine.split(' ');
                const cpIndex = parts.indexOf('cp');
                if (cpIndex !== -1 && parts.length > cpIndex + 1) {
                    const scoreValue = parseInt(parts[cpIndex + 1]) / 100;
                    // Adjust score based on your color
                    stockfishScore = yourColor === 'b' ? -scoreValue : scoreValue;
                }
            } else if (infoLine.includes('score mate ')) {
                const parts = infoLine.split(' ');
                const mateIndex = parts.indexOf('mate');
                if (mateIndex !== -1 && parts.length > mateIndex + 1) {
                    const mateMove = parseInt(parts[mateIndex + 1]);
                    // Adjust mate score based on your color
                    const adjustedMate = yourColor === 'b' ? -mateMove : mateMove;
                    stockfishScore = `Mate in ${Math.abs(adjustedMate)}`;
                }
            }
        } catch (e) {
            log(`Error updating Stockfish info: ${e.message}`);
        }
    }

    // Get Maia prediction from Lichess API
    async function getMaiaPrediction(fen) {
        try {
            const response = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=3`, {
                // Added timeout and credentials options
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                timeout: 3000,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Lichess API returned status ${response.status}`);
            }

            const data = await response.json();
            if (data.pvs && data.pvs.length > 0) {
                // Get the top move from Lichess
                const humanLikeMove = data.pvs[0].moves.split(' ')[0];
                maiaBestMove = humanLikeMove;
                log(`Maia predicted: ${humanLikeMove}`);
                updateDisplay();
                return humanLikeMove;
            }

            return null;
        } catch (e) {
            log(`Error getting Maia prediction: ${e.message}`);
            return await getMaiaPredictionFallback(fen); // Try fallback on error
        }
    }

    // Fallback to GM_xmlhttpRequest for cross-origin requests
    async function getMaiaPredictionFallback(fen) {
        try {
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                return new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=3`,
                        headers: {
                            'Accept': 'application/json'
                        },
                        timeout: 5000, // 5 second timeout
                        onload: function(response) {
                            if (response.status === 200) {
                                try {
                                    const data = JSON.parse(response.responseText);
                                    if (data.pvs && data.pvs.length > 0) {
                                        const humanLikeMove = data.pvs[0].moves.split(' ')[0];
                                        maiaBestMove = humanLikeMove;
                                        log(`Maia predicted (fallback): ${humanLikeMove}`);
                                        updateDisplay();
                                        resolve(humanLikeMove);
                                    } else {
                                        resolve(null);
                                    }
                                } catch (e) {
                                    log(`Error parsing Maia response: ${e.message}`);
                                    reject(e);
                                }
                            } else {
                                log(`API error status: ${response.status}`);
                                reject(new Error(`API returned status ${response.status}`));
                            }
                        },
                        onerror: function(error) {
                            log(`Maia request error: ${error}`);
                            reject(error);
                        },
                        ontimeout: function() {
                            log(`Maia request timed out`);
                            reject(new Error('Request timed out'));
                        }
                    });
                });
            } else {
                log(`GM_xmlhttpRequest not available, using fetch`);
                return getMaiaPrediction(fen);
            }
        } catch (e) {
            log(`Error in Maia prediction fallback: ${e.message}`);
            return null;
        }
    }

    // Function to get the FEN string from the board - ENHANCED VERSION
    function getFEN() {
        try {
            // Direct access to the board object
            const board = document.querySelector('wc-chess-board');
            boardDOM = board; // Store reference to board DOM

            if (board && board.game && typeof board.game.getFEN === 'function') {
                const fen = board.game.getFEN();
                if (fen && fen.includes('/') && fen.includes(' ')) {
                    statusIndicator.style.backgroundColor = 'green';

                    // Determine whose turn it is - FIXED for more robustness
                    if (board.game.getPlayingAs && typeof board.game.getPlayingAs === 'function') {
                        try {
                            // 1 = white, 2 = black
                            const playingAs = board.game.getPlayingAs();
                            yourColor = playingAs === 1 ? 'w' : playingAs === 2 ? 'b' : null;
                            
                            // If getPlayingAs returns invalid value, fallback to next method
                            if (!yourColor) {
                                yourColor = inferColorFromFEN(fen);
                            }
                            
                            isYourTurn = fen.split(' ')[1] === yourColor;
                            log(`Playing as: ${yourColor}, Your turn: ${isYourTurn}`);
                        } catch (e) {
                            log(`Error in getPlayingAs: ${e.message}, using fallback`);
                            yourColor = inferColorFromFEN(fen);
                            isYourTurn = true;
                        }
                    } else {
                        // Fallback using inference from board
                        yourColor = inferColorFromFEN(fen);
                        isYourTurn = true;
                    }

                    // Check if position changed
                    if (lastBoardState && lastBoardState !== fen) {
                        const lastTurn = lastBoardState.split(' ')[1];
                        const currentTurn = fen.split(' ')[1];
                        if (lastTurn !== currentTurn) {
                            // A move was made - update position changed flag
                            positionHasChanged = true;
                            moveCount++; // Increment move counter
                            log(`Move detected: #${moveCount}, FEN: ${fen.substring(0, 30)}...`);
                            
                            // Periodic engine reinitialization
                            periodicReinit();
                        }
                    }

                    // Store current board state
                    lastBoardState = fen;

                    // Calculate material balance
                    calculateMaterialBalance(fen);

                    return fen;
                }
            }

            // Enhanced fallbacks for getting FEN
            
            // Fallback 1: Try to find the FEN in the game service
            if (window.chesscom && window.chesscom.gameService && window.chesscom.gameService.games) {
                const games = window.chesscom.gameService.games;
                const gameIds = Object.keys(games);
                if (gameIds.length > 0) {
                    const currentGame = games[gameIds[0]];
                    if (currentGame && currentGame.getFEN) {
                        const fen = currentGame.getFEN();
                        if (fen && fen.includes('/') && fen.includes(' ')) {
                            log('Found FEN via gameService');
                            statusIndicator.style.backgroundColor = 'green';
                            return fen;
                        }
                    }
                }
            }
            
            // Fallback 2: Look for the FEN in data attributes of DOM elements
            const chessBoardElements = document.querySelectorAll('[data-fen]');
            for (const element of chessBoardElements) {
                const fen = element.getAttribute('data-fen');
                if (fen && fen.includes('/') && fen.includes(' ')) {
                    log('Found FEN via data-fen attribute');
                    statusIndicator.style.backgroundColor = 'green';
                    return fen;
                }
            }
            
            // Fallback 3: Try to derive from PGN if available
            const pgn = getPGNFromPage();
            if (pgn) {
                const fen = deriveFENFromPGN(pgn);
                if (fen) {
                    log('Derived FEN from PGN');
                    statusIndicator.style.backgroundColor = 'orange'; // Indicating fallback method
                    return fen;
                }
            }

            // If we got here, we couldn't get the FEN
            log('ERROR: Could not get FEN from any source');
            statusIndicator.style.backgroundColor = 'red';
            return null;
        } catch (e) {
            log(`ERROR: getting FEN: ${e.message}`);
            statusIndicator.style.backgroundColor = 'red';
            return null;
        }
    }
    
    // Helper function to infer your color from the board orientation
    function inferColorFromFEN(fen) {
        try {
            // Look at the board orientation
            const board = document.querySelector('wc-chess-board');
            if (board && board.boardOrientation) {
                return board.boardOrientation === 'white' ? 'w' : 'b';
            }
            
            // Alternative way to infer from board class
            if (board && board.classList) {
                if (board.classList.contains('board-flipped')) {
                    return 'b'; // Flipped board usually means playing as black
                } else {
                    return 'w'; // Default orientation is white
                }
            }
            
            // Last resort: just use the current turn from FEN
            return fen.split(' ')[1];
        } catch (e) {
            log(`Error inferring color: ${e.message}`);
            return 'w'; // Default to white
        }
    }
    
    // Helper function to get PGN from the page
    function getPGNFromPage() {
        try {
            // Try various ways to get PGN
            if (window.chesscom && window.chesscom.gamePlayer && window.chesscom.gamePlayer.getPGN) {
                return window.chesscom.gamePlayer.getPGN();
            }
            
            // Try to find PGN in window variables
            if (window.chessBoardSingleton && window.chessBoardSingleton.pgn) {
                return window.chessBoardSingleton.pgn;
            }
            
            return null;
        } catch (e) {
            log(`Error getting PGN: ${e.message}`);
            return null;
        }
    }
    
    // Helper function to derive FEN from PGN
    function deriveFENFromPGN(pgn) {
        // This is a simplified placeholder. In a real implementation,
        // you would need a chess library to convert PGN to FEN accurately.
        try {
            // Check if Chess.js or other libraries are available
            if (window.Chess) {
                const chess = new window.Chess();
                chess.loadPgn(pgn);
                return chess.fen();
            }
            
            return null;
        } catch (e) {
            log(`Error deriving FEN from PGN: ${e.message}`);
            return null;
        }
    }

    // Calculate material balance from FEN
    function calculateMaterialBalance(fen) {
        let balance = 0;
        const position = fen.split(' ')[0];

        for (let i = 0; i < position.length; i++) {
            const char = position[i];
            if (pieceValues.hasOwnProperty(char)) {
                balance += pieceValues[char];
            }
        }

        // Update the material balance indicator
        const color = balance > 0 ? '#4CAF50' : balance < 0 ? '#F44336' : 'white';
        materialBalance.style.color = color;
        materialBalance.innerText = `Material: ${balance > 0 ? '+' : ''}${balance}`;

        return balance;
    }

    // Function to clear all markings
    function clearMarkings() {
        const board = boardDOM;
        if (board && board.game && board.game.markings) {
            try {
                board.game.markings.removeAll();
            } catch (e) {
                log(`Error clearing markings: ${e.message}`);
            }
        }
    }

    // Function to draw an arrow
    function drawArrow(from, to, color) {
        const board = boardDOM;
        if (board && board.game && board.game.markings) {
            try {
                const marking = {
                    type: 'arrow',
                    data: {
                        color: color || '#00ffcc',
                        from: from,
                        to: to
                    }
                };
                board.game.markings.addOne(marking);
                return marking;
            } catch (e) {
                log(`Error drawing arrow: ${e.message}`);
                return null;
            }
        }
        return null;
    }

    // Function to highlight a square
    function highlightSquare(square, color) {
        const board = boardDOM;
        if (board && board.game && board.game.markings) {
            try {
                const marking = {
                    type: 'highlight',
                    data: {
                        color: color || '#00ffcc',
                        square: square
                    }
                };
                board.game.markings.addOne(marking);
                return marking;
            } catch (e) {
                log(`Error highlighting square: ${e.message}`);
                return null;
            }
        }
        return null;
    }

    // Update display with current engine suggestions
    function updateDisplay() {
        try {
            // Clear existing markings
            clearMarkings();

            // Update text display
            let displayText = '';
            
            // Add engine type to display
            const engineTypeDisplay = currentEngineType === 'wasm' ? 'WebAssembly' : 'JavaScript';

            // Powerhouse display - combine both engines
            if (stockfishBestMove && maiaBestMove) {
                const sfFrom = stockfishBestMove.substring(0, 2);
                const sfTo = stockfishBestMove.substring(2, 4);
                const maiaFrom = maiaBestMove.substring(0, 2);
                const maiaTo = maiaBestMove.substring(2, 4);

                // Determine consensus - if both engines agree, that's the best move
                if (stockfishBestMove === maiaBestMove) {
                    // Strong consensus - both engines agree
                    drawArrow(sfFrom, sfTo, '#ff9800'); // Orange for consensus
                    highlightSquare(sfFrom, '#ff980099');
                    highlightSquare(sfTo, '#ff980099');

                    const scoreText = stockfishScore ?
                        (typeof stockfishScore === 'string' ? stockfishScore : `${stockfishScore > 0 ? '+' : ''}${stockfishScore.toFixed(2)}`) :
                        '';

                    displayText += `⚡ BEST: ${sfFrom}-${sfTo} (${scoreText})\n`;
                    displayText += `💪 Strong consensus! [#${moveCount}]\n`;
                    displayText += `🔧 Engine: ${engineTypeDisplay}`;
                } else {
                    // No consensus - show both with preference for Stockfish
                    drawArrow(sfFrom, sfTo, '#00ff00'); // Green for Stockfish
                    highlightSquare(sfFrom, '#00ff0080');
                    highlightSquare(sfTo, '#00ff0080');

                    // Draw Maia's move if different
                    drawArrow(maiaFrom, maiaTo, '#0066ff80'); // Semi-transparent blue for Maia

                    // Only highlight Maia squares if they're different from Stockfish's
                    if (maiaFrom !== sfFrom) {
                        highlightSquare(maiaFrom, '#0066ff80');
                    }
                    if (maiaTo !== sfTo) {
                        highlightSquare(maiaTo, '#0066ff80');
                    }

                    // Add weighted evaluation
                    const scoreText = stockfishScore ?
                        (typeof stockfishScore === 'string' ? stockfishScore : `${stockfishScore > 0 ? '+' : ''}${stockfishScore.toFixed(2)}`) :
                        '';

                    displayText += `⚡ Primary: ${sfFrom}-${sfTo} (${scoreText})`;
                    displayText += `\n👤 Alt: ${maiaFrom}-${maiaTo}`;
                    displayText += `\n🔧 Engine: ${engineTypeDisplay}`;
                }
                
                // Reset failures count on successful analysis
                consecutiveFailures = 0;
                
            } else if (stockfishBestMove) {
                // Only Stockfish available
                const from = stockfishBestMove.substring(0, 2);
                const to = stockfishBestMove.substring(2, 4);

                drawArrow(from, to, '#00ff00');
                highlightSquare(from, '#00ff0080');
                highlightSquare(to, '#00ff0080');

                const scoreText = stockfishScore ?
                    (typeof stockfishScore === 'string' ? stockfishScore : `${stockfishScore > 0 ? '+' : ''}${stockfishScore.toFixed(2)}`) :
                    '';

                displayText += `⚡ Engine: ${from}-${to} (${scoreText})`;
                displayText += `\n⏳ Waiting for Maia... [#${moveCount}]`;
                displayText += `\n🔧 Engine: ${engineTypeDisplay}`;
                
                // Reset consecutive failures if at least Stockfish worked
                if (consecutiveFailures > 0) consecutiveFailures--;
                
            } else if (maiaBestMove) {
                // Only Maia available
                const from = maiaBestMove.substring(0, 2);
                const to = maiaBestMove.substring(2, 4);

                drawArrow(from, to, '#0066ff');
                highlightSquare(from, '#0066ff80');
                highlightSquare(to, '#0066ff80');

                displayText += `⚡ Human-like: ${from}-${to}`;
                displayText += `\n⏳ Waiting for Stockfish... [#${moveCount}]`;
                displayText += `\n🔧 Engine: ${engineTypeDisplay}`;
                
                // Reset consecutive failures if at least Maia worked
                if (consecutiveFailures > 0) consecutiveFailures--;
                
            } else {
                // Neither engine has results yet
                displayText = `⚡ Analyzing move #${moveCount}...`;
                displayText += `\n🔧 Engine: ${engineTypeDisplay}`;
                
                // Check if we're stuck in a failure loop
                if (isAnalyzing) {
                    displayText += '\nCalculating...';
                } else {
                    // Not analyzing but no results means something failed
                    consecutiveFailures++;
                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                        displayText = '⚠️ Multiple analysis failures detected.\nTry pressing the reset button (🔄)';
                        log(`${consecutiveFailures} consecutive failures - suggesting reset`);
                    }
                }
            }

            // Update overlay text
            overlay.innerText = displayText.trim();

            // Update danger status
            updateDangerStatus();

        } catch (e) {
            log(`ERROR: in display update: ${e.message}`);
            overlay.innerText = `⚠️ Display error. Press 🔄 to reset.`;
        }
    }

    // Function to detect king in danger
    function detectKingDanger() {
        try {
            const board = boardDOM;
            if (!board || !board.game) return false;

            // Check if in check - try multiple methods
            if (board.game.inCheck && typeof board.game.inCheck === 'function' && board.game.inCheck()) {
                return true;
            }
            
            // Alternative check detection
            if (board.game.isCheck && typeof board.game.isCheck === 'function' && board.game.isCheck()) {
                return true;
            }
            
            // Try to detect check from FEN
            const fen = board.game.getFEN();
            if (fen && fen.includes('+')) {
                return true;
            }

            // Get the FEN and calculate material balance
            const balance = calculateMaterialBalance(fen);

            // If playing as black, invert the balance
            const adjustedBalance = yourColor === 'b' ? -balance : balance;

            // If significant material disadvantage
            return adjustedBalance < -3;
        } catch (e) {
            log(`Error in danger detection: ${e.message}`);
            return false;
        }
    }

    // Update background color when king is in danger
    function updateDangerStatus() {
        const inDanger = detectKingDanger();
        if (inDanger) {
            overlay.style.backgroundColor = 'rgba(244, 67, 54, 0.85)'; // Red background for danger
        } else {
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Normal background
        }
    }

    // Analyze position with Stockfish
    function analyzeWithStockfish(fen) {
        try {
            if (!stockfish) {
                if (!initStockfish()) {
                    log('ERROR: Stockfish not initialized, attempting to restart');
                    setTimeout(() => {
                        initStockfish();
                        analyzeWithStockfish(fen);
                    }, 1000);
                    return;
                }
            }

            // Reset Stockfish results
            stockfishBestMove = null;
            stockfishScore = null;

            // Stop any ongoing analysis
            stockfish.postMessage('stop');

            // Set up the position
            stockfish.postMessage('position fen ' + fen);

            // Start analysis with adaptive depth based on move number
            // Lower depth for faster responses in longer games
            const depth = moveCount > 15 ? 8 : 10;
            const moveTime = moveCount > 20 ? 800 : 1000;
            
            log(`Analyzing with Stockfish: depth ${depth}, movetime ${moveTime}ms`);
            stockfish.postMessage(`go depth ${depth} movetime ${moveTime}`);

            // Set a backup timeout to ensure we get some result
            setTimeout(() => {
                if (!stockfishBestMove) {
                    log('Stockfish analysis timeout - forcing bestmove request');
                    stockfish.postMessage('stop');  // Force stop and get bestmove
                }
            }, moveTime + 500);

        } catch (e) {
            log(`ERROR: analyzing with Stockfish: ${e.message}`);
            stockfishBestMove = null;
            consecutiveFailures++;
            
            // If too many consecutive failures, try to recover
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                log('Too many consecutive failures, attempting auto-recovery');
                performFullReset();
            }
        }
    }

    // Setup observer to detect board changes
    function setupBoardObserver() {
        if (boardObserver) {
            boardObserver.disconnect();
            boardObserver = null;
        }
        
        log('Setting up board observers');

        // ENHANCED: Multiple detection methods for better resilience
        
        // 1. Try to observe the chess board directly
        const board = document.querySelector('wc-chess-board');
        if (board) {
            boardObserver = new MutationObserver((mutations) => {
                const newFEN = getFEN();
                if (newFEN && newFEN !== lastFen) {
                    log(`Board change detected via observer, new FEN: ${newFEN.substring(0, 20)}...`);
                    lastFen = newFEN;
                    positionHasChanged = true;
                    analyzePosition(true);
                }
            });

            boardObserver.observe(board, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true
            });
            
            log('Primary board observer set up');
        }
        
        // 2. Also observe the move list for changes
        const movesList = document.querySelector('.moves, .move-list-component');
        if (movesList) {
            const movesObserver = new MutationObserver((mutations) => {
                log('Move list change detected');
                const newFEN = getFEN();
                if (newFEN && newFEN !== lastFen) {
                    lastFen = newFEN;
                    positionHasChanged = true;
                    analyzePosition(true);
                }
            });
            
            movesObserver.observe(movesList, {
                childList: true,
                subtree: true
            });
            
            log('Moves list observer set up');
        }
        
        // 3. Observe the clock for time changes as a last resort
        const clocks = document.querySelectorAll('.clock-component');
        if (clocks.length > 0) {
            const clockObserver = new MutationObserver((mutations) => {
                // Only check occasionally to avoid too many checks
                if (Math.random() < 0.2) {  // 20% chance to check on clock update
                    const newFEN = getFEN();
                    if (newFEN && newFEN !== lastFen) {
                        lastFen = newFEN;
                        positionHasChanged = true;
                        analyzePosition(true);
                    }
                }
            });
            
            clocks.forEach(clock => {
                clockObserver.observe(clock, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            });
            
            log('Clock observer set up');
        }

        // 4. Backup interval-based check with variable frequency
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        
        // Adaptive interval based on move count - check more frequently in later game
        const checkFrequency = moveCount > 20 ? 500 : moveCount > 10 ? 800 : 1000;
        
        autoRefreshInterval = setInterval(() => {
            const fenNow = getFEN();
            if (fenNow && fenNow !== lastFen) {
                log(`Position change detected via interval: ${fenNow.substring(0, 20)}...`);
                lastFen = fenNow;
                positionHasChanged = true;
                analyzePosition(true);
            }
            
            // Periodic check to make sure engines are responsive
            if (!isAnalyzing && moveCount > 0 && moveCount % 5 === 0) {
                // Every 5 moves, make sure engines are responsive
                if (stockfish) {
                    try {
                        // Simple ping to see if engine is responsive
                        stockfish.postMessage('isready');
                    } catch (e) {
                        log(`ERROR: Stockfish not responsive: ${e.message}`);
                        initStockfish();  // Reinitialize if there's an issue
                    }
                }
            }
        }, checkFrequency);
        
        log(`Backup interval set up with ${checkFrequency}ms frequency`);
    }

    // Function to analyze the current board position
    function analyzePosition(force = false) {
        // Only run if we're on a game page
        if (!isChessGamePage()) {
            overlay.style.display = 'none';
            materialBalance.style.display = 'none';
            refreshButton.style.display = 'none';
            powerhouseIndicator.style.display = 'none';
            toggleButton.style.display = 'none';
            recoveryButton.style.display = 'none';
            engineIndicator.style.display = 'none';
            return;
        } else {
            refreshButton.style.display = 'block';
            powerhouseIndicator.style.display = 'block';
            toggleButton.style.display = 'block';
            recoveryButton.style.display = 'block';
            engineIndicator.style.display = 'block';
        }

        // Don't analyze if we're already analyzing
        if (isAnalyzing && !force) {
            log('Already analyzing, skipping request');
            return;
        }

        // Rate limiting
        const now = Date.now();
        if (!force && now - lastAnalysisTime < 500) { // Don't analyze more than once per 0.5 seconds
            return;
        }
        lastAnalysisTime = now;

        const fen = getFEN();

        // Enhanced error checking and recovery
        if (!fen) {
            log('ERROR: Could not detect board position');
            overlay.innerText = '⚠️ Cannot detect board position';
            overlay.style.display = 'block';
            consecutiveFailures++;
            
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                overlay.innerText = '⚠️ Multiple detection failures. Try the reset button (🔄)';
                log(`${consecutiveFailures} consecutive failures - suggesting reset`);
            }
            return;
        } else if (fen === lastFen && !force && !positionHasChanged) {
            // No change, no need to analyze again
            return;
        }

        // Log analysis attempt
        log(`Analyzing position: ${fen.substring(0, 30)}... (move #${moveCount}, force=${force})`);

        // Update the last FEN and start analyzing
        lastFen = fen;
        isAnalyzing = true;
        positionHasChanged = false;

        overlay.innerText = `⚡ Analyzing move #${moveCount}...`;
        overlay.style.display = 'block';
        materialBalance.style.display = 'block';

        try {
            // Check if the game is over
            const board = boardDOM;
            const isGameOver = (board && board.game && 
                ((board.game.getPositionInfo && board.game.getPositionInfo().gameOver) || 
                 (board.game.isCheckmate && board.game.isCheckmate()) ||
                 (board.game.isStalemate && board.game.isStalemate())));
            
            if (isGameOver) {
                log('Game is over, stopping analysis');
                overlay.innerText = 'Game is over';
                isAnalyzing = false;
                return;
            }

            // Reset any existing analysis results
            stockfishBestMove = null;
            maiaBestMove = null;

            // Start analysis with both engines
            analyzeWithStockfish(fen);
            getMaiaPredictionFallback(fen)
                .catch(e => {
                    log(`Maia analysis error: ${e.message}`);
                });

            // Set a timeout to ensure we get some result, even if one engine fails
            setTimeout(() => {
                if (isAnalyzing) {
                    log('Analysis completion timeout');
                    if (!stockfishBestMove && !maiaBestMove) {
                        log('ERROR: No results from either engine');
                        overlay.innerText = '⚠️ Analysis timeout. Try the reset button (🔄)';
                        consecutiveFailures++;
                    } else {
                        updateDisplay();
                    }
                    isAnalyzing = false;
                    
                    // Auto-recovery if too many failures
                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                        log('Auto-recovery triggered due to excessive failures');
                        performFullReset();
                    }
                }
            }, 10000); // 10 second timeout

            // Update display now (it will be updated again when results come in)
            updateDisplay();

        } catch (e) {
            log(`ERROR: in analysis: ${e.message}`);
            overlay.innerText = `⚠️ Analysis error. Try the reset button (🔄)`;
            isAnalyzing = false;
            consecutiveFailures++;
            
            // Auto-recovery if too many failures
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                log('Auto-recovery triggered due to error');
                performFullReset();
            }
        }
    }

    // Function to check if we're on a chess game page
    function isChessGamePage() {
        return window.location.href.includes('/play/') ||
               window.location.href.includes('/game/') ||
               window.location.href.includes('/live/') ||
               window.location.href.includes('/analysis');
    }

    // Check if we're on a page where the script should run
    function checkPage() {
        const isGamePage = isChessGamePage();
        log(`Page check: ${window.location.href}, isGamePage=${isGamePage}`);
        
        toggleButton.style.display = isGamePage ? 'block' : 'none';
        refreshButton.style.display = isGamePage ? 'block' : 'none';
        powerhouseIndicator.style.display = isGamePage ? 'block' : 'none';
        recoveryButton.style.display = isGamePage ? 'block' : 'none';
        engineIndicator.style.display = isGamePage ? 'block' : 'none';
        materialBalance.style.display = isGamePage && overlay.style.display !== 'none' ? 'block' : 'none';

        if (isGamePage) {
            setupBoardObserver();
            positionHasChanged = true; // Force analysis on page change
        } else {
            if (boardObserver) {
                boardObserver.disconnect();
                boardObserver = null;
            }
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }
    }

    // Monitor URL changes (for navigating between games without reload)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            log(`URL changed from ${lastUrl} to ${currentUrl}`);
            lastUrl = currentUrl;
            lastFen = '';
            moveCount = 0; // Reset move count on new game
            consecutiveFailures = 0; // Reset failures
            checkPage();
            clearMarkings();
            setTimeout(() => analyzePosition(true), 1000);
        }
    }).observe(document, { subtree: true, childList: true });

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'h') {
            // Alt+H to toggle hints
            const newDisplay = overlay.style.display === 'none' ? 'block' : 'none';
            overlay.style.display = newDisplay;
            materialBalance.style.display = newDisplay;
        }
        if (e.altKey && e.key === 'r') {
            // Alt+R to refresh analysis
            lastFen = '';
            analyzePosition(true);
        }
        if (e.altKey && e.key === 'x') {
            // Alt+X for full reset
            performFullReset();
        }
        if (e.altKey && e.key === 'e') {
            // Alt+E to toggle engine type
            currentEngineType = currentEngineType === 'wasm' ? 'js' : 'wasm';
            engineIndicator.innerText = currentEngineType === 'wasm' ? '⚙️ WASM' : '⚙️ JS';
            log(`Switched to ${currentEngineType.toUpperCase()} engine via keyboard`);
            if (stockfish) {
                stockfish.terminate();
                stockfish = null;
            }
            initStockfish();
            lastFen = '';
            analyzePosition(true);
        }
    });

    // Initial setup
    log('Chess Powerhouse Advisor (Roma10boss Edition) initializing...');
    initStockfish();
    checkPage();
    setTimeout(() => analyzePosition(true), 1000);

    log('Chess Powerhouse Advisor initialized. Press Alt+H to toggle hints, Alt+R to refresh, Alt+X for full reset, Alt+E to toggle engine type.');
    
    // Setup heartbeat to check script health
    setInterval(() => {
        // This will run every 30 seconds to make sure everything is still working
        if (isChessGamePage() && !isAnalyzing) {
            const fen = getFEN();
            if (fen && (moveCount > 0 || lastFen === '')) {
                log(`Heartbeat check at move #${moveCount}`);
            }
        }
    }, 30000);
})();
