/* Built-in coloring pages catalog: polished line art stored as base64 PNG text (assets-b64/pages__*.b64),
   loaded per page on demand. v = art version: saved coloring from an older version of a page is ignored. */
window.COLOR_PAGES = {
  animals: {
    label: 'Animals',
    emoji: '🐱',
    pages: [
      { id: 'cat', title: 'Cat', b64: 'assets-b64/pages__animals__cat.png.b64', v: 2 },
      { id: 'dog', title: 'Dog', b64: 'assets-b64/pages__animals__dog.png.b64', v: 2 },
      { id: 'bunny', title: 'Bunny', b64: 'assets-b64/pages__animals__bunny.png.b64', v: 2 },
      { id: 'lion', title: 'Lion', b64: 'assets-b64/pages__animals__lion.png.b64', v: 2 },
      { id: 'elephant', title: 'Elephant', b64: 'assets-b64/pages__animals__elephant.png.b64', v: 2 },
      { id: 'fish', title: 'Fish', b64: 'assets-b64/pages__animals__fish.png.b64', v: 2 },
      { id: 'owl', title: 'Owl', b64: 'assets-b64/pages__animals__owl.png.b64', v: 2 },
      { id: 'turtle', title: 'Turtle', b64: 'assets-b64/pages__animals__turtle.png.b64', v: 2 }
    ]
  },
  food: {
    label: 'Food',
    emoji: '🍎',
    pages: [
      { id: 'apple', title: 'Apple', b64: 'assets-b64/pages__food__apple.png.b64', v: 2 },
      { id: 'banana', title: 'Banana', b64: 'assets-b64/pages__food__banana.png.b64', v: 2 },
      { id: 'strawberry', title: 'Berry', b64: 'assets-b64/pages__food__strawberry.png.b64', v: 2 },
      { id: 'icecream', title: 'Ice Cream', b64: 'assets-b64/pages__food__icecream.png.b64', v: 2 },
      { id: 'cupcake', title: 'Cupcake', b64: 'assets-b64/pages__food__cupcake.png.b64', v: 2 },
      { id: 'donut', title: 'Donut', b64: 'assets-b64/pages__food__donut.png.b64', v: 2 },
      { id: 'pizza', title: 'Pizza', b64: 'assets-b64/pages__food__pizza.png.b64', v: 2 },
      { id: 'watermelon', title: 'Melon', b64: 'assets-b64/pages__food__watermelon.png.b64', v: 2 }
    ]
  },
  princess: {
    label: 'Princess',
    emoji: '👑',
    pages: [
      { id: 'princess', title: 'Princess', b64: 'assets-b64/pages__princess__princess.png.b64', v: 2 },
      { id: 'castle', title: 'Castle', b64: 'assets-b64/pages__princess__castle.png.b64', v: 2 },
      { id: 'crown', title: 'Crown', b64: 'assets-b64/pages__princess__crown.png.b64', v: 2 },
      { id: 'wand', title: 'Wand', b64: 'assets-b64/pages__princess__wand.png.b64', v: 2 },
      { id: 'unicorn', title: 'Unicorn', b64: 'assets-b64/pages__princess__unicorn.png.b64', v: 2 },
      { id: 'fairy', title: 'Fairy', b64: 'assets-b64/pages__princess__fairy.png.b64', v: 2 },
      { id: 'carriage', title: 'Carriage', b64: 'assets-b64/pages__princess__carriage.png.b64', v: 2 },
      { id: 'dragon', title: 'Dragon', b64: 'assets-b64/pages__princess__dragon.png.b64', v: 2 }
    ]
  },
  objects: {
    label: 'Things',
    emoji: '🧸',
    pages: [
      { id: 'house', title: 'House', b64: 'assets-b64/pages__objects__house.png.b64', v: 2 },
      { id: 'ball', title: 'Ball', b64: 'assets-b64/pages__objects__ball.png.b64', v: 2 },
      { id: 'rocket', title: 'Rocket', b64: 'assets-b64/pages__objects__rocket.png.b64', v: 2 },
      { id: 'teddy', title: 'Teddy', b64: 'assets-b64/pages__objects__teddy.png.b64', v: 2 },
      { id: 'kite', title: 'Kite', b64: 'assets-b64/pages__objects__kite.png.b64', v: 2 },
      { id: 'umbrella', title: 'Umbrella', b64: 'assets-b64/pages__objects__umbrella.png.b64', v: 2 },
      { id: 'balloons', title: 'Balloons', b64: 'assets-b64/pages__objects__balloons.png.b64', v: 2 },
      { id: 'gift', title: 'Present', b64: 'assets-b64/pages__objects__gift.png.b64', v: 2 }
    ]
  },
  vehicles: {
    label: 'Vehicles',
    emoji: '🚒',
    pages: [
      { id: 'car', title: 'Car', b64: 'assets-b64/pages__vehicles__car.png.b64', v: 2 },
      { id: 'firetruck', title: 'Fire Truck', b64: 'assets-b64/pages__vehicles__firetruck.png.b64', v: 2 },
      { id: 'bus', title: 'Bus', b64: 'assets-b64/pages__vehicles__bus.png.b64', v: 2 },
      { id: 'train', title: 'Train', b64: 'assets-b64/pages__vehicles__train.png.b64', v: 2 },
      { id: 'airplane', title: 'Airplane', b64: 'assets-b64/pages__vehicles__airplane.png.b64', v: 2 },
      { id: 'helicopter', title: 'Helicopter', b64: 'assets-b64/pages__vehicles__helicopter.png.b64', v: 2 },
      { id: 'tractor', title: 'Tractor', b64: 'assets-b64/pages__vehicles__tractor.png.b64', v: 2 },
      { id: 'sailboat', title: 'Boat', b64: 'assets-b64/pages__vehicles__sailboat.png.b64', v: 2 }
    ]
  },
  custom: {
    label: 'Mine',
    emoji: '✨',
    pages: [] // loaded from custom/pages.json
  }
};
