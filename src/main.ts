import './style.css'


import CreateKaboom, { GameObj, LayerComp, OriginComp, PosComp, ScaleComp, SpriteComp } from "kaboom";
export declare var kaboom: typeof CreateKaboom;


const k = kaboom({
  canvas: document.querySelector('canvas')!,
	width: window.innerWidth,
	height: window.innerHeight - 25,
  clearColor: [0, 0, 0, 0.5]
});

const randomFrom = <T>(arr: T[]) => arr[Math.floor(randomBetween(0, arr.length))]
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
k.scene('gameplay', () => {
  k.layers([
    'background',
    'entities',
    'ui'
  ], 'entities');

  const started = k.time();

  const speed = (() => {
    const MAX_SPEED = 15;

    let speed = 10;

    const generateText = () => `Speed: ${speed.toFixed(1)}`

    const display = k.add([
      k.text(generateText(), 32),
      k.pos(0, 0),
      k.origin('topleft')
    ]);

    return {
      get: () => speed,
      offRoad(){
        this.decrease(speed * 0.05, 0.25);
      },
      turn(){
        this.decrease(speed * 0.005, 0.25);
      },
      accelerate(){
        if (!fuel.get()) return;
        this.increase(speed >= 2.5 ? speed * 0.001 : speed * 0.01)
      },
      noFuel(){
        this.decrease(0.025);
      },
      inOil(){
        this.decrease(speed * 0.01, 0.1)
      },
      increase: (by: number) => {
        speed = Math.min(MAX_SPEED, speed + by);
        display.text = generateText();
      },
      decrease(by: number, least?: number){
        speed = Math.max(least || 0, speed - by)
        display.text = generateText();
      }
    }
  })();

  const distance = (() => {
    let distance = 0;

    const generateText = () => `Distance: ${distance.toFixed(1)}`

    const display = k.add([
      k.text(generateText(), 32),
      k.pos(0, 32),
      k.origin('topleft')
    ]);

    k.action(() => {
      distance += speed.get();
      display.text = generateText()
    })

    return {
      get: () => distance
    }
  })();
  const score = (() => {
    let score = 0;

    const generateText = () => `Score: ${score}`

    const display = k.add([
      k.text(generateText(), 32),
      k.pos(k.width() - 12.5, 32),
      k.origin('topright')
    ]);

    return {
      get: () => score,
      set: (newScore: number) => {
        score = newScore
        display.text = generateText();
      }
    }
  })();

  const fuel = (() => {
    const MAX_FUEL = 25;

    let fuel = 12.5;

    const generateText = () => `Fuel: ${fuel.toFixed(1)}`

    const display = k.add([
      k.text(generateText(), 32),
      k.pos(k.width() - 12.5, 0),
      k.origin('topright')
    ]);

    k.action(() => {
      fuel = Math.max(0, fuel - speed.get() / 1000);
      display.text = generateText();
    })

    return {
      get: () => fuel,
      turn(){
        this.decrease(0.001);
      },
      increase(by: number){
        fuel = Math.min(MAX_FUEL, fuel + by)
        display.text = generateText();
      },
      decrease(by: number){
        fuel = Math.max(0, fuel - by)
        display.text = generateText();
      }
    }
  })();


  const { shoulders, shoulderWidth } = (() => {
    type Road = GameObj & SpriteComp & PosComp & OriginComp & ScaleComp;

    const { SCALE, WIDTH, HEIGHT } = (() => {
      const road = k.sprite('road-straight')
      const SCALE = 480 / road.width;
      return {
        SCALE,
        WIDTH: road.width * SCALE,
        HEIGHT: road.height * SCALE
      };
    })();

    (() => {
      const { SCALE, WIDTH, HEIGHT } = (() => {
        const road = k.sprite('pitlane-lines')
        const SCALE = 240 / road.width;
        return {
          SCALE,
          WIDTH: road.width * SCALE,
          HEIGHT: road.height * SCALE
        };
      })();

      let lastSpawned = 0;
      const minimumDistance = 1000 * 10;
      k.loop(10, () => {
        if (distance.get() - lastSpawned <= minimumDistance) return;
        lastSpawned = distance.get();
        k.add([
          k.sprite('pitlane-lines'),
          k.pos(k.width() / 2, -k.height()),
          k.origin('top'),
          k.layer('entities'),
          k.scale(SCALE),
          'pit'
        ]);
      });

      k.action('pit', (pit) => {
        pit.pos.y += speed.get();
        if (pit.pos.y > k.height()) k.destroy(pit);
      })
    })();

    const roads: Road[] = [];

    const addRoad = (y: number) => {
      const road = k.add([
        k.sprite('road-straight'),
        k.pos(k.width() / 2, y + HEIGHT),
        k.origin('top'),
        k.scale(SCALE),
        k.layer('background'),
        'road'
      ]) as Road;
      k.add([
        k.sprite('background'),
        k.pos(k.width() / 2 - WIDTH / 2, y + HEIGHT),
        k.origin('topright'),
        k.scale(SCALE),
        k.layer('background'),
        'road'
      ]);
      k.add([
        k.sprite('background'),
        k.pos(k.width() / 2 + WIDTH / 2, y + HEIGHT),
        k.origin('topleft'),
        k.scale(SCALE),
        k.layer('background'),
        'road'
      ]);

      return road;
    }

    let lastRoad = null;
    while (true){
      lastRoad = addRoad(lastRoad ? lastRoad.pos.y : -HEIGHT);
      roads.push(lastRoad);
      if (lastRoad.pos.y >= k.height() + HEIGHT) break;
    }
    k.action('road', (road) => {
      road.pos.y += speed.get()
      if (road.pos.y < k.height()) return;
      const latestRoad = roads.reduce((latest, road) => latest.pos.y < road.pos.y ? latest : road);
      road.pos.y = latestRoad.pos.y - HEIGHT + speed.get();
    });


    const shoulderWidth = (k.width() / 2) - (WIDTH / 4) - 10;
    return {
      shoulders: [
        k.add([
          k.pos(0, 0),
          k.origin('topleft'),
          k.rect(shoulderWidth, k.height()),
          k.color(0, 0, 0, 0),
          'shoulder'
        ]),
        k.add([
          k.pos(k.width(), 0),
          k.origin('topright'),
          k.rect(shoulderWidth, k.height()),
          k.color(0, 0, 0, 0),
          'shoulder'
        ])
      ],
      shoulderWidth
    }
  })();
  const player = (() => {
    type Player = GameObj & SpriteComp & PosComp & OriginComp & LayerComp;
    const { SCALE, WIDTH, HEIGHT } = (() => {
      const road = k.sprite('gas-vehicle')
      const SCALE = 80 / road.width;
      return {
        SCALE,
        WIDTH: road.width * SCALE,
        HEIGHT: road.height * SCALE
      };
    })();
    const carType = randomFrom(['gas', 'diesel', 'electric']);
    const player = k.add([
      k.pos(k.width() / 2, k.height() / 5 * 4),
      k.sprite(`${carType}-vehicle`),
      k.color(1, 1, 1, 1),
      k.origin('center'),
      k.layer('entities'),
      k.scale(SCALE),
      k.rotate(0),
      'player',
      { type: carType }
    ]) as Player;
    let lastChange = 0;
    let accelerationDelay = 500;
    player.action(() => {
      if (shoulders.some(shoulder => player.isOverlapped(shoulder))) return speed.offRoad();

      if (fuel.get()){
        const now = Date.now();
        if (now - lastChange >= accelerationDelay) speed.accelerate();
      }
      else{
        speed.noFuel();
      }
    });

    player.collides('fuel', (fuelCan: GameObj) => {
      k.destroy(fuelCan);
      if (fuelCan.type === player.type) return fuel.increase(randomBetween(3, 9));
      fuel.decrease(randomBetween(1, 3));
    })

    let hitPit: null | number = null;
    player.collides('pit', (pit: GameObj) => {
      if (hitPit === pit._id) return;
      hitPit = pit._id
      const carType = randomFrom(['gas', 'diesel', 'electric']);
      player.type = carType;
      player.changeSprite(`${carType}-vehicle`)
    })

    player.collides('gem', (gem: GameObj) => {
      k.destroy(gem)
      score.set(score.get()+1)
    })

    player.action(() => {
      if (k.get('oil').every(oil => !oil.isOverlapped(player))) return;
      speed.inOil();

      if (!player.angle) return;
      player.pos.x += 15 * (player.angle < 0 ? 1 : -1)
      player.angle *= 3;
    })

    const handleTurn = (offset: number) => () => {
      if (!fuel.get() && !speed.get()) return;
      player.pos.x += offset;
      lastChange = Date.now();
      speed.turn();
      fuel.turn();
      player.angle = offset < 0 ? 0.1 : -0.1
    }
    k.keyDown('left', handleTurn(-5));
    k.keyDown('right', handleTurn(5));
    k.keyDown('a', handleTurn(-5));
    k.keyDown('d', handleTurn(5));
    k.keyRelease('left', () => player.angle = 0);
    k.keyRelease('right', () => player.angle = 0);
    k.keyRelease('a', () => player.angle = 0);
    k.keyRelease('d', () => player.angle = 0);
    k.mouseDown(() => {
      const clickX = k.mousePos().x;
      const diff = clickX - player.pos.x;
      if (Math.abs(diff) < 5) {
        player.angle = 0;
        return;
      }
      const offset = 5 * (clickX < player.pos.x ? -1 : 1);
      handleTurn(offset)();
    })
    k.mouseRelease(() => {
      player.angle = 0;
    })

    return player;
  })();

  (() => {
    const { SCALE, HEIGHT } = (() => {
      const gem = k.sprite('gem-red')
      const SCALE = (50-12.5) / gem.width;
      return {
        SCALE,
        WIDTH: gem.width * SCALE,
        HEIGHT: gem.height * SCALE
      };
    })();

    let lastSpawned = 0;
    const minimumDistance = 250;
    k.loop(1, () => {
      if (distance.get() - lastSpawned <= minimumDistance) return;
      lastSpawned = distance.get();
      const color = randomFrom(['red', 'green', 'blue', 'yellow', 'magenta', 'cyan'])
      const gem = k.add([
        k.sprite(`gem-${color}`),
        k.pos(randomBetween(shoulderWidth, k.width() - shoulderWidth), -k.height()),
        k.origin('center'),
        k.layer('entities'),
        k.scale(SCALE),
        k.rotate(randomBetween(0, 3.14)),
        'gem'
      ]);
      gem.play('idle')
    });

    k.action('gem', gem => {
      gem.pos.y += speed.get();
      if (gem.pos.y > k.height()) k.destroy(gem);
    })

  })();

  (() => {
    const { CAN_SCALE, CAN_HEIGHT } = (() => {
      const road = k.sprite('gas-can')
      const CAN_SCALE = (50-12.5) / road.width;
      return {
        CAN_SCALE,
        CAN_WIDTH: road.width * CAN_SCALE,
        CAN_HEIGHT: road.height * CAN_SCALE
      };
    })();
    const { BAT_SCALE, BAT_HEIGHT } = (() => {
      const road = k.sprite('electric-battery')
      const BAT_SCALE = (50-12.5) / road.width;
      return {
        BAT_SCALE,
        BAT_WIDTH: road.width * BAT_SCALE,
        BAT_HEIGHT: road.height * BAT_SCALE
      };
    })();
    const { OIL_SCALE, OIL_HEIGHT } = (() => {
      const oil = k.sprite('oil')
      const OIL_SCALE = 75 / oil.width;
      return {
        OIL_SCALE,
        OIL_WIDTH: oil.width * OIL_SCALE,
        OIL_HEIGHT: oil.height * OIL_SCALE
      };
    })();

    const ITEMS = ['gas-can', 'diesel-can', 'electric-battery', 'oil'];
    const FUELS = ['gas-can', 'diesel-can', 'electric-battery'];
    let itemPool = [ ...ITEMS ];
    let lastSpawned = 0;

    const minimumDistance = 1000 / 3 * 2;
    k.loop(1, () => {
      if (distance.get() - lastSpawned <= minimumDistance) return;
      // 25% chance of failure
      if (!Math.floor(randomBetween(0, 4))) return;

      lastSpawned = distance.get()
      if (!itemPool.length) itemPool = [ ...ITEMS ];
      const name = randomFrom(itemPool);
      itemPool.splice(itemPool.indexOf(name), 1);
      k.add([
        k.sprite(name),
        k.pos(randomBetween(shoulderWidth, k.width() - shoulderWidth), -k.height() * 2),
        k.origin('center'),
        k.scale(name === 'electric-battery' ? BAT_SCALE : name === 'oil' ? OIL_SCALE : CAN_SCALE),
        FUELS.includes(name) ? 'fuel' : 'oil',
        { type: name.split('-')[0] }
      ]);
    });
    k.action('fuel', (fuel) => {
      fuel.pos.y += speed.get();
      if (fuel.pos.y > k.height()) k.destroy(fuel);
    });
    k.action('oil', (oil) => {
      oil.pos.y += speed.get();
      if (oil.pos.y > k.height()) k.destroy(oil);
    });
  })();

  (() => {
    k.action(() => {
      if (!speed.get() && !fuel.get()) k.go('game-over', distance.get(), k.time() - started, score.get())
    })
  })();
});

k.scene('game-over', (distance: number, duration: number, score: number) => {
  k.add([
    k.text(`Distance: ${distance.toFixed(2)}\nDuration: ${duration.toFixed(2)}\nScore: ${score.toFixed(2)}`, 32),
    k.pos(k.width() / 2, k.height() / 2),
    k.origin('center')
  ])
  k.mouseClick(() => k.go('gameplay'));
  k.keyDown('space', () => k.go('gameplay'));
});

k.scene('main-menu', () => {
  k.add([
    k.text('Infinite Driver', 32),
    k.pos(k.width() / 2, 0),
    k.origin('top')
  ]);

  k.add([
    k.text('Your goal is to collect as many Xs as possible!\n\nBut you have a limited amount of fuel...\n\nFortunatly, you\'ll find tons of\nuseful fuel on the road!\n\nUnfortunatly, your vehicle will only accept\none of the three fuel types:\n- Gasoline\n- Diesel\n- Electricity\n\nPick up the wrong fuel and\nyou\'ll be in for a bad time...', 16),
    k.pos(0, k.height() / 2),
    k.origin('left')
  ]);

  k.add([
    k.text('Use the Left/Right or A/D keys to\nmove your vehicle left and right,\nor click to the left/right of it.', 16),
    k.pos(0, k.height()),
    k.origin('botleft')
  ]);

  k.mouseClick(() => k.go('gameplay'))
  k.keyDown('space', () => k.go('gameplay'));
});

(async () => {
  await Promise.all([
    k.loadSprite('road-straight', './src/assets/road/straight.png'),
    k.loadSprite('background', './src/assets/background.png'),
    k.loadSprite('gas-vehicle', './src/assets/gas-vehicle.png'),
    k.loadSprite('diesel-vehicle', './src/assets/diesel-vehicle.png'),
    k.loadSprite('electric-vehicle', './src/assets/electric-vehicle.png'),
    k.loadSprite('gas-can', './src/assets/gas-can.svg'),
    k.loadSprite('diesel-can', './src/assets/diesel-can.svg'),
    k.loadSprite('electric-battery', './src/assets/electric-battery.png'),
    k.loadSprite('pitlane-lines', './src/assets/road/pitlane_lines.png'),
    k.loadSprite('oil', './src/assets/oil.png'),
    ...['red', 'yellow', 'green', 'blue', 'magenta', 'cyan'].map(color =>
      k.loadSprite(`gem-${color}`, `./src/assets/gem-${color}.png`, {
        sliceX: 5,
        sliceY: 2,
        anims: {
          idle: {
            from: 0,
            to: 9
          }
        }
      }))
  ])
  k.start('main-menu');
})();