const concaveman = require('concaveman');

const points = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10]
];

try {
  const hull = concaveman(points, 4, 0);
  console.log("Hull:", hull);
} catch (e) {
  console.error("Error:", e);
}
