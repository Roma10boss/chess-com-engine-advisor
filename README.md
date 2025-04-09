# chess-com-engine-advisor
chess tuto

# Chess.com Powerhouse Engine Advisor (Roma10boss Edition)

A Tampermonkey script that provides powerful combined engine analysis (Stockfish + Maia) on Chess.com with an improved UI.

## Features

- Shows combined analysis from both Stockfish (strong engine) and Maia (human-like engine)
- Uses Roma10boss's repository versions of Stockfish for reliable operation
- Displays best moves with visual arrows on the board
- Shows material balance
- Works for both online games and analysis
- Fixed positioning that doesn't interfere with the Chess.com interface
- Highlights consensus moves when both engines agree
- Automatically adapts to long games with engine reinitialization
- Ability to switch between WebAssembly and JavaScript engine implementations

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click on the script link below to install:
   - [Install Chess.com Powerhouse Engine Advisor (Roma10boss Edition)](https://github.com/YOUR-USERNAME/chess-com-engine-advisor/raw/main/chess-com-powerhouse-engine-advisor.user.js)

## Usage

Once installed, the script will automatically activate when you visit Chess.com game pages.

- **Toggle Hint**: Click the "Toggle Hint" button or press Alt+H
- **Refresh Analysis**: Click the ↻ button or press Alt+R
- **Full Reset**: Click the red 🔄 button or press Alt+X (use this if analysis stops working)
- **Toggle Engine Type**: Click the engine indicator or press Alt+E to switch between WebAssembly and JavaScript implementations

## Troubleshooting

If you encounter the "Stockfish not initialized" error or the script stops working during a game:

1. Click the red reset button (🔄) to perform a full reset
2. Try switching engine types by clicking the engine indicator (⚙️) or pressing Alt+E
3. If that doesn't work, try refreshing the page and starting again
4. Ensure you have a stable internet connection as the script needs to access external resources

## How It Works

This script uses the following external resources:

- Roma10boss's Stockfish WebAssembly implementation: https://github.com/Roma10boss/stockfish.wasm
- Roma10boss's Stockfish JavaScript implementation: https://github.com/Roma10boss/stockfish.js
- Lichess cloud evaluation API for Maia (human-like) moves

The script loads these engines and provides a dual-analysis view, showing both the computer's best move and a more human-like alternative.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
