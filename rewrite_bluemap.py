import re

with open('src/states/services/territories.service.ts', 'r') as f:
    content = f.read()

# We need to replace the initialization of stateGroups
content = content.replace(
    'stateGroups[settlement.state.id] = { state: settlement.state, territories: [] };',
    'stateGroups[settlement.state.id] = { state: settlement.state, territories: [], settlementHulls: [] };'
)

# After getting the hull for a settlement, we need to push it to stateGroups
# Find the end of the settlement cluster loop where bordersData is set:
settlement_hull_injection = """
        bordersData[`${group.settlement.id}_border_${index}`] = {
          type: 'extrude',
          position: { x: hull[0].x, y: (minY + Math.max(minY, maxY)) / 2, z: hull[0].z },
          shape: hull,
          shapeMinY: minY,
          shapeMaxY: Math.max(minY, maxY),
          fillColor: { r, g, b, a: 0.05 },
          lineColor: { r, g, b, a: 1.0 },
          depthTestEnabled: false,
          listed: false,
        };

        if (group.settlement.state) {
          const stateId = group.settlement.state.id;
          if (stateGroups[stateId]) {
            stateGroups[stateId].settlementHulls.push({
              points: hull,
              minX: Math.min(...hull.map(p => p.x)),
              maxX: Math.max(...hull.map(p => p.x)),
              minZ: Math.min(...hull.map(p => p.z)),
              maxZ: Math.max(...hull.map(p => p.z)),
              minY,
              maxY: Math.max(minY, maxY),
            });
          }
        }
"""
content = re.sub(
    r"bordersData\[`\$\{group\.settlement\.id\}_border_\$\{index\}`\] = \{.*?listed: false,\s*\};",
    settlement_hull_injection.strip(),
    content,
    flags=re.DOTALL
)

# Rewrite the stateGroups loop to use settlementHulls instead of territories
state_loop_original = """Object.values(stateGroups).forEach((group) => {
      const clusters = this.clusterTerritories(group.territories, 1500); // 1500 блоков для государства
      if (clusters.length === 0) return;

      let largestCluster = clusters[0];

      clusters.forEach((cluster, index) => {
        if (cluster.length > largestCluster.length) largestCluster = cluster;

        const points: { x: number; z: number }[] = [];
        let minY = Infinity;
        let maxY = -Infinity;

        cluster.forEach((t) => {
          points.push(
            { x: t.minX, z: t.minZ },
            { x: t.maxX, z: t.minZ },
            { x: t.maxX, z: t.maxZ },
            { x: t.minX, z: t.maxZ },
          );
          const tMin = t.minY ?? -64;
          const tMax = t.maxY ?? 319;
          if (tMin < minY) minY = tMin;
          if (tMax > maxY) maxY = tMax;
        });

        // Государства: concavity = 2.5 (более плотное прилегание к границам поселений)
        const hull = this.getConcaveHull(points, 2);"""

state_loop_new = """Object.values(stateGroups).forEach((group) => {
      if (!group.settlementHulls || group.settlementHulls.length === 0) return;
      const clusters = this.clusterTerritories(group.settlementHulls, 1500);
      if (clusters.length === 0) return;

      let largestCluster = clusters[0];

      clusters.forEach((cluster, index) => {
        if (cluster.length > largestCluster.length) largestCluster = cluster;

        const points: { x: number; z: number }[] = [];
        let minY = Infinity;
        let maxY = -Infinity;

        cluster.forEach((hullObj) => {
          points.push(...hullObj.points);
          if (hullObj.minY < minY) minY = hullObj.minY;
          if (hullObj.maxY > maxY) maxY = hullObj.maxY;
        });

        // Государства: строим границу по точкам границ поселений
        const hull = this.getConcaveHull(points, 2);"""

content = content.replace(state_loop_original, state_loop_new)

# Also need to fix the label generation for state
# It uses largestCluster which is now an array of settlementHulls
label_original = """      const labelPoints: { x: number; z: number }[] = [];
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

label_new = """      const labelPoints: { x: number; z: number }[] = [];
      let labelMaxY = -Infinity;
      largestCluster.forEach((hullObj) => {
        labelPoints.push(...hullObj.points);
        if (hullObj.maxY > labelMaxY) labelMaxY = hullObj.maxY;
      });"""

content = content.replace(label_original, label_new)

with open('src/states/services/territories.service.ts', 'w') as f:
    f.write(content)
