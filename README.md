# 🎮 Multiplayer Elemental Game  
A modern, animated, interactive version of the classic **Stone–Paper–Scissors** concept — expanded with **Fire, Water, and Air** elements!  
This is a **2-Player battle game** with smooth UI, battle animations, sound-less effects, scoring, and round history.

## 🌟 Features
✔ 6 Playable Elements → **Stone, Paper, Scissors, Fire, Water, Air**  
✔ Modern UI with soft gradients and floating background particles  
✔ Animated battle scene with icons ⚔️  
✔ Screen shake effect on clash  
✔ Scoreboard for Player 1 & Player 2  
✔ Live Round History  
✔ Game Rules Modal (Basic / Win Conditions / Tips)  
✔ Restart Game Button  
✔ Fully responsive layout  
✔ Lightweight & pure **HTML + CSS + JavaScript**

## 🧠 Game Logic — Win Conditions

| Element | Beats |
|--------|-----------------------------|
| **Stone** | Scissors, Fire |
| **Paper** | Stone, Water |
| **Scissors** | Paper, Air |
| **Fire** | Paper, Air |
| **Water** | Fire, Stone |
| **Air** | Water, Scissors |

## 📂 Project Structure
📁 element-game/
├── index.html
├── style.css
├── script.js
└── README.md

## 🚀 How to Run the Game

### **Option 1 — Open Locally**
1. Download the project files  
2. Open `index.html` in any browser

### **Option 2 — Host on GitHub Pages**
1. Upload your project to a GitHub repository  
2. Go to  
   **Settings → Pages → Deploy from branch → main / root**  
3. Your live link will be generated automatically 🎉

## 🛠️ Technologies Used
- **HTML5** → Structure  
- **CSS3** → UI design, animations, gradients  
- **JavaScript (Vanilla)** → Game logic, score system, rules modal  
- **Emojis** → Element icons for visual clarity

### ✔ Battle Logic  
```js
if (player1Move === move2) {
  resultText = "It's a tie!";
} else if (isWinner(player1Move, move2)) {
  resultText = "Player 1 wins!";
} else {
  resultText = "Player 2 wins!";
}
