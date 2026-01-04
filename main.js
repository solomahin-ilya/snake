const canvas = document.getElementById("canvas");
const start = document.getElementById("start");
const stop = document.getElementById("stop");
const score = document.getElementById("score");
const container = document.getElementById("container");

const interpolate = ({ coordinate, max, step }) => {
  if (coordinate + step > max || coordinate + step < 0) {
    return max - coordinate;
  }

  return coordinate + step;
};

class Snake {
  constructor(maxX, maxY) {
    this.body = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    this.maxX = maxX;
    this.maxY = maxY || maxX;
  }

  updateBody(newCoords) {
    this.body.unshift(newCoords);
    this.body.pop();
  }

  push({ x, y }) {
    this.body.push({ x, y });
  }

  pop() {
    const item = this.body.at(-1);
    this.body = this.body.pop();
    return item;
  }

  move({ x: stepX, y: stepY }) {
    const x = interpolate({
      coordinate: this.body[0].x,
      max: this.maxX,
      step: stepX,
    });
    const y = interpolate({
      coordinate: this.body[0].y,
      max: this.maxY,
      step: stepY,
    });

    this.updateBody({ x, y });
  }

  isCollision() {
    return Boolean(
      this.body.filter(
        ({ x, y }) => x === this.body[0].x && y === this.body[0].y
      ).length > 1
    );
  }
}

class Field {
  constructor(id, count) {
    this.canvas = document.getElementById(id);
    this.canvas.width = 500;
    this.canvas.height = 500;
    this.ctx = this.canvas.getContext("2d");

    this.gridCount = count;
    this.gridWidth = this.canvas.width / this.gridCount;
    this.gridHeight = this.canvas.height / this.gridCount;
    this.grid = Array(this.gridCount).fill(Array(this.gridCount).fill(0));
  }

  drawRect(
    x = 0,
    y = 0,
    width = this.canvas.width,
    height = this.canvas.height,
    background = "#c4c4c4"
  ) {
    this.ctx.fillStyle = background;
    this.ctx.fillRect(x, y, width, height);
  }

  iterate(cb) {
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        cb(i, j);
      }
    }
  }

  drawGrid() {
    this.iterate((x, y) => {
      this.drawRect(
        x * this.gridWidth,
        y * this.gridHeight,
        this.gridWidth,
        this.gridHeight,
        (x + y) % 2 ? "#c4c4c4" : "#f0f0f4"
      );
    });
  }

  drawApple(x, y) {
    this.drawRect(
      x * this.gridWidth,
      y * this.gridHeight,
      this.gridWidth,
      this.gridHeight,
      "#b2e31b"
    );
  }

  drawSnake(snake) {
    this.iterate((x, y) => {
      for (let i = 0; i < snake.body.length; i++) {
        if (x === snake.body[i].x && y === snake.body[i].y) {
          this.drawRect(
            x * this.gridWidth,
            y * this.gridHeight,
            this.gridWidth,
            this.gridHeight,
            "#000"
          );
        }
      }
    });
  }

  checkCollisionWithApple(head, apple) {
    return !!apple && head.x === apple.x && head.y === apple.y;
  }
}

class Game {
  constructor(canvas, gridCount) {
    this.gridCount = gridCount;
    this.field = new Field(canvas, gridCount);
    this.snake = new Snake(this.field.gridCount - 1);
    this._velocity = { x: 1, y: 0 };
    this.messageId = "end-message";
    this._score = 0;

    this.intervalId = null;
    this.apple = null;
    this.duration = 200;

    this.keyHandler = (event) => {
      if (event.key.toUpperCase() === "W") {
        this._velocity =
          this._velocity.y !== 1 ? { x: 0, y: -1 } : this._velocity;
      } else if (event.key.toUpperCase() === "D") {
        this._velocity =
          this._velocity.x !== -1 ? { x: 1, y: 0 } : this._velocity;
      } else if (event.key.toUpperCase() === "A") {
        this._velocity =
          this._velocity.x !== 1 ? { x: -1, y: 0 } : this._velocity;
      } else if (event.key.toUpperCase() === "S") {
        this._velocity =
          this._velocity.y !== -1 ? { x: 0, y: 1 } : this._velocity;
      }
    };

    document.addEventListener("keyup", this.keyHandler);

    this.render();
  }

  createMessage() {
    const endMessage = document.createElement("p");
    endMessage.textContent = "Game Over!";
    endMessage.id = this.messageId;
    endMessage.classList.add("end");
    container.appendChild(endMessage);
  }

  showScore() {
    score.textContent = this._score;
  }

  removeMessage() {
    const message = document.getElementById(this.messageId);
    if (message) {
      message.remove();
    }
  }

  getVelocity() {
    return this._velocity;
  }

  render() {
    this.field.drawGrid();
    this.field.drawSnake(this.snake);
    if (this.apple) {
      this.field.drawApple(this.apple.x, this.apple.y);
    }
  }

  _play() {
    if (this.field.checkCollisionWithApple(this.snake.body[0], this.apple)) {
      this._score += 1;
      this.showScore();

      const tail = this.snake.body.at(-1);
      const prevTail = this.snake.body.at(-2);

      const newTail = {
        x: tail.x - (prevTail.x - tail.x),
        y: tail.y - (prevTail.y - tail.y),
      };

      this.snake.body.push(newTail);
      this.apple = null;
    }

    if (this.snake.isCollision()) {
      this.gameOver();
    }

    if (!this.apple) {
      const x = Math.max(Math.round(Math.random() * this.gridCount - 1), 1);
      const y = Math.max(Math.round(Math.random() * this.gridCount - 1), 1);
      this.apple = { x, y };
    }

    this.render();
    this.snake.move(this.getVelocity());
  }

  go() {
    this._score = 0;
    this.removeMessage();
    clearInterval(this.intervalId);
    this._play();

    this.intervalId = setInterval(() => {
      this._play();
    }, this.calculateDuration());
  }

  calculateDuration() {
    return this.duration - (this._score ** 2 / this.duration / 10) * 2;
  }

  gameOver() {
    clearInterval(this.intervalId);
    this.createMessage();
    this._score = 0;
  }

  destroy() {
    document.removeEventListener("keyup", this.keyHandler);
    clearInterval(this.intervalId);
  }
}

let game = new Game("canvas", 20);

start.addEventListener("click", (event) => {
  game.destroy();
  game = new Game("canvas", 20);
  game.go();
});

stop.addEventListener("click", (event) => {
  game.destroy();
  game = null;
});
