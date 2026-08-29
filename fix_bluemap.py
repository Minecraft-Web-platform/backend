import re

with open('src/states/services/territories.service.ts', 'r') as f:
    content = f.read()

# Fix 1: Generate an id for settlementHulls
old_push = """stateGroups[stateId].settlementHulls.push({
              points: hull,"""
new_push = """stateGroups[stateId].settlementHulls.push({
              id: Math.random().toString(),
              points: hull,"""
content = content.replace(old_push, new_push)

# Fix 2: Revert label logic for settlements
old_label = """// Лейбл поселения вешаем только на самый крупный кластер
      const labelPoints: { x: number; z: number }[] = [];
      let labelMaxY = -Infinity;
      largestCluster.forEach((hullObj) => {
        labelPoints.push(...hullObj.points);
        if (hullObj.maxY > labelMaxY) labelMaxY = hullObj.maxY;
      });"""
      
new_label = """// Лейбл поселения вешаем только на самый крупный кластер
      const labelPoints: { x: number; z: number }[] = [];
      let labelMaxY = -Infinity;
      largestCluster.forEach((t) => {
        labelPoints.push(
          { x: t.minX, z: t.minZ },
          { x: t.maxX, z: t.minZ },
          { x: t.maxX, z: t.maxZ },
          { x: t.minX, z: t.maxZ },
        );
        const tMax = t.maxY ?? 319;
        if (tMax > labelMaxY) labelMaxY = tMax;
      });"""
content = content.replace(old_label, new_label)

with open('src/states/services/territories.service.ts', 'w') as f:
    f.write(content)
