import { Injectable, NotFoundException, BadRequestException, ForbiddenException,  } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TerritoryEntity } from '../entities/territory.entity';
import { SettlementEntity } from '../entities/settlement.entity';
import { StateEntity } from '../entities/state.entity';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../economy/entities/company.entity';

// Dynamically import concaveman when needed because it's an ESM module
let concaveman: (points: number[][], concavity: number, lengthThreshold: number) => number[][];

@Injectable()
export class TerritoriesService {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  private blueMapMarkersCache: Record<string, any> = {};
  private blueMapMarkersCacheTime: { [mapName: string]: number } = {};
  private readonly CACHE_TTL = 1000 * 60 * 60 * 24;

  constructor(
    @InjectRepository(TerritoryEntity)
    private readonly territoryRepo: Repository<TerritoryEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(StateEntity)
    private readonly stateRepo: Repository<StateEntity>,
  ) {}

  public invalidateBlueMapCache() {
    this.blueMapMarkersCache = {};
    this.blueMapMarkersCacheTime = {};
  }

  public async getProfilesForPlayer(username: string) {
    const profiles: { id: string, name: string, type: string }[] = [];

    const user = await this.userRepo.findOne({ where: { username } });
    if (user) {
      profiles.push({ id: user.id.toString(), name: `Личный приват (${username})`, type: 'player' });
    }

    const companies = await this.companyRepo.find({ where: { ownerUsername: username } });
    for (const c of companies) {
      profiles.push({ id: c.id, name: `Компания: ${c.name}`, type: 'company' });
    }

    const settlements = await this.settlementRepo.find({ where: { mayorUsername: username } });
    for (const c of settlements) {
      profiles.push({ id: c.id, name: `Поселение: ${c.name}`, type: 'settlement' });
    }

    const states = await this.stateRepo.find({ where: { leaderUsername: username } });
    for (const s of states) {
      profiles.push({ id: s.id, name: `Государство: ${s.name}`, type: 'state' });
    }

    return profiles;
  }

  public async getSurveyorDataForPlayer(username: string) {
    const profiles = await this.getProfilesForPlayer(username);
    const user = await this.userRepo.findOne({ where: { username } });
    
    let jurisdictions: { id: string; name: string }[] = [];
    if (user && user.stateId) {
      const settlements = await this.settlementRepo.find({ where: { stateId: user.stateId } });
      jurisdictions = settlements.map(c => ({ id: c.id, name: c.name }));
    }

    return { jurisdictions, profiles };
  }

  private getConcaveHull(points: { x: number; z: number }[], concavity: number = 1.5) {
    if (points.length <= 3) return points;
    const pointsArray = points.map((p) => [p.x, p.z]);
    const hullArray = concaveman(pointsArray, concavity, 0);
    return hullArray.map((p: number[]) => ({ x: p[0], z: p[1] }));
  }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clusterTerritories(territories: Array<{ id: string, minX: number, maxX: number, minZ: number, maxZ: number }>, distanceThreshold: number): any[][] {
    if (!territories || territories.length === 0) return [];
    const clusters: Array<Array<{ id: string, minX: number, maxX: number, minZ: number, maxZ: number }>> = [];
    const visited = new Set<string>();
    const getCenter = (t: { minX: number, maxX: number, minZ: number, maxZ: number }) => ({
      x: (t.minX + t.maxX) / 2,
      z: (t.minZ + t.maxZ) / 2,
    });
    const getDistance = (t1: { minX: number, maxX: number, minZ: number, maxZ: number }, t2: { minX: number, maxX: number, minZ: number, maxZ: number }) => {
      const c1 = getCenter(t1);
      const c2 = getCenter(t2);
      return Math.hypot(c1.x - c2.x, c1.z - c2.z);
    };
    for (const t of territories) {
      if (visited.has(t.id)) continue;

      const currentCluster = [t];
      visited.add(t.id);

      let i = 0;
      while (i < currentCluster.length) {
        const curr = currentCluster[i];
        for (const other of territories) {
          if (!visited.has(other.id) && getDistance(curr, other) <= distanceThreshold) {
            visited.add(other.id);
            currentCluster.push(other);
          }
        }
        i++;
      }
      clusters.push(currentCluster);
    }

    return clusters;
  }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async addTerritory(dto: any) {
    const { minX, minY, minZ, maxX, maxY, maxZ, ownerType, ownerId, settlementId } = dto;
    const actualMinX = Math.min(minX, maxX);
    const actualMaxX = Math.max(minX, maxX);
    const actualMinY = Math.min(minY, maxY);
    const actualMaxY = Math.max(minY, maxY);
    const actualMinZ = Math.min(minZ, maxZ);
    const actualMaxZ = Math.max(minZ, maxZ);

    const overlapping = await this.territoryRepo
      .createQueryBuilder('t')
      .where(':minX <= t.maxX', { minX: actualMinX })
      .andWhere(':maxX >= t.minX', { maxX: actualMaxX })
      .andWhere(':minY <= t.maxY', { minY: actualMinY })
      .andWhere(':maxY >= t.minY', { maxY: actualMaxY })
      .andWhere(':minZ <= t.maxZ', { minZ: actualMinZ })
      .andWhere(':maxZ >= t.minZ', { maxZ: actualMaxZ })
      .getOne();

    if (overlapping) {
      throw new BadRequestException('Указанная зона пересекается с уже существующей территорией');
    }

    if (ownerType === 'company') {
      const company = await this.companyRepo.findOne({ where: { id: ownerId } });
      if (!company) throw new BadRequestException('Компания не найдена');
      if (company.settlementId && company.settlementId !== settlementId) {
        throw new BadRequestException('Территория компании должна находиться в юрисдикции поселения регистрации компании');
      }
    } else if (ownerType === 'settlement') {
      if (ownerId !== settlementId) {
        throw new BadRequestException('Поселение может приватить территорию только в своей юрисдикции');
      }
    }

    const territory = this.territoryRepo.create({
      ownerType,
      ownerId,
      settlementId,
      minX: actualMinX,
      minY: actualMinY,
      minZ: actualMinZ,
      maxX: actualMaxX,
      maxY: actualMaxY,
      maxZ: actualMaxZ,
    });

    const saved = await this.territoryRepo.save(territory);
    this.invalidateBlueMapCache();
    return saved;
  }

  public async deleteTerritoryMod(id: string) {
    const territory = await this.territoryRepo.findOne({ where: { id } });
    if (!territory) throw new NotFoundException('Территория не найдена');
    await this.territoryRepo.remove(territory);
    this.invalidateBlueMapCache();
    return { success: true };
  }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async checkTerritoryAccess(territory: TerritoryEntity, user: any) {
    if (user.role === 'admin' || user.role === 'mod') return true;
    if (territory.ownerType === 'player') {
        if (territory.ownerId !== user.id) throw new ForbiddenException('Это не ваша территория');
    } else if (territory.ownerType === 'settlement') {
        const settlement = await this.settlementRepo.findOne({ where: { id: territory.ownerId as string } });
        if (!settlement || settlement.mayorUsername?.toLowerCase() !== user.username.toLowerCase()) {
            throw new ForbiddenException('Вы не мэр этого поселения');
        }
    }
  }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async deleteTerritoryWeb(id: string, user: any) {
    const territory = await this.territoryRepo.findOne({ where: { id } });
    if (!territory) throw new NotFoundException('Территория не найдена');
    await this.checkTerritoryAccess(territory, user);
    await this.territoryRepo.remove(territory);
    this.invalidateBlueMapCache();
    return { success: true };
  }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async toggleVisibility(id: string, isHidden: boolean, user: any) {
    const territory = await this.territoryRepo.findOne({ where: { id } });
    if (!territory) throw new NotFoundException('Территория не найдена');
    await this.checkTerritoryAccess(territory, user);
    territory.isHiddenOnMap = isHidden;
    await this.territoryRepo.save(territory);
    this.invalidateBlueMapCache();
    return territory;
  }

  public async getAllTerritories() {
    return this.territoryRepo.find({
      relations: ['settlement', 'settlement.state', 'property'],
    });
  }

  public async getBlueMapMarkers(mapName: string = 'world'): Promise<Record<string, unknown>> {
    if (!concaveman) {
      const concavemanRaw = await eval(`import('concaveman')`);
      concaveman = concavemanRaw.default || concavemanRaw;
    }
    const now = Date.now();
    if (this.blueMapMarkersCache[mapName] && now - this.blueMapMarkersCacheTime[mapName] < this.CACHE_TTL) {
      return this.blueMapMarkersCache[mapName];
    }

    const territories = await this.territoryRepo.find({
      relations: ['settlement', 'settlement.state', 'property'],
    });

    const markersData: Record<string, unknown> = {};
    const bordersData: Record<string, unknown> = {};
    const stateBordersData: Record<string, unknown> = {};

    const settlementGroups: Record<string, { settlement: SettlementEntity; territories: TerritoryEntity[] }> = {};
    const stateGroups: Record<string, { state: StateEntity; territories: TerritoryEntity[], settlementHulls: { id: string, points: {x:number, z:number}[], minX: number, maxX: number, minZ: number, maxZ: number, minY: number, maxY: number }[] }> = {};

    territories.forEach((t) => {
      if (t.settlement) {
        const settlement = t.settlement;
        if (!settlementGroups[settlement.id]) {
          settlementGroups[settlement.id] = { settlement: settlement, territories: [] };
        }
        settlementGroups[settlement.id].territories.push(t);

        if (settlement.state) {
          if (!stateGroups[settlement.state.id]) {
            stateGroups[settlement.state.id] = { state: settlement.state, territories: [], settlementHulls: [] };
          }
          stateGroups[settlement.state.id].territories.push(t);
        }
      }

      const stateName = t.settlement?.state?.name || 'Независимый поселение';

      let hash = 0;
      for (let i = 0; i < stateName.length; i++) {
        hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
      }
      let hexColor = '#';
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        hexColor += ('00' + value.toString(16)).substr(-2);
      }

      const r = parseInt(hexColor.slice(1, 3), 16) || 255;
      const g = parseInt(hexColor.slice(3, 5), 16) || 0;
      const b = parseInt(hexColor.slice(5, 7), 16) || 0;

      let detailHtml = '';
      if (t.property) {
        detailHtml = `<div style="padding: 10px; min-width: 200px;">
          <h3 style="margin-top: 0; margin-bottom: 8px;">${t.property.name}</h3>
          ${t.property.isForSale ? `<div style="color: #ffaa00; font-weight: bold; margin-bottom: 5px;">Продается: ${t.property.price}</div>` : ''}
          ${t.property.description ? `<p style="margin: 0; font-size: 14px; opacity: 0.8;">${t.property.description}</p>` : ''}
        </div>`;
      }

      // 1. 3D Зона (без label, чтобы избежать бага LabelPopup при клике)
      markersData[t.id + '_zone'] = {
        type: 'extrude',
        position: { x: (t.minX + t.maxX) / 2, y: t.maxY ?? 64, z: (t.minZ + t.maxZ) / 2 },
        shape: [
          { x: t.minX, z: t.minZ },
          { x: t.maxX, z: t.minZ },
          { x: t.maxX, z: t.maxZ },
          { x: t.minX, z: t.maxZ },
        ],
        shapeMinY: t.minY ?? -64,
        shapeMaxY: t.maxY ?? 319,
        fillColor: { r, g, b, a: 0.15 }, // Делаем приваты прозрачнее
        lineColor: { r, g, b, a: 0.3 }, // Границы приватов мягкие
        depthTestEnabled: false,
        listed: false, // Не дублируем в меню
        ...(detailHtml ? { detail: detailHtml } : {}),
      };
    });

    Object.values(settlementGroups).forEach((group) => {
      const clusters = this.clusterTerritories(group.territories, 800); // 800 блоков для поселения
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

        // Поселения: concavity = 4 (более плавные границы, меньше вдавливаний)
        const hull = this.getConcaveHull(points, 4);
        if (hull.length < 3) return;

        let r, g, b;
        if (group.settlement.color && /^#([0-9A-F]{3}){1,2}$/i.test(group.settlement.color)) {
          const hex = group.settlement.color;
          r = parseInt(hex.length === 4 ? hex.slice(1, 2).repeat(2) : hex.slice(1, 3), 16);
          g = parseInt(hex.length === 4 ? hex.slice(2, 3).repeat(2) : hex.slice(3, 5), 16);
          b = parseInt(hex.length === 4 ? hex.slice(3, 4).repeat(2) : hex.slice(5, 7), 16);
        } else {
          const stateName = group.settlement.state?.name || 'Независимый поселение';
          let hash = 0;
          for (let i = 0; i < stateName.length; i++) hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
          let hexColor = '#';
          for (let i = 0; i < 3; i++) hexColor += ('00' + ((hash >> (i * 8)) & 0xff).toString(16)).substr(-2);
          r = parseInt(hexColor.slice(1, 3), 16) || 255;
          g = parseInt(hexColor.slice(3, 5), 16) || 0;
          b = parseInt(hexColor.slice(5, 7), 16) || 0;
        }

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
              id: Math.random().toString(),
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
      });

      // Лейбл поселения вешаем только на самый крупный кластер
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
      });

      const centerX = (Math.min(...labelPoints.map((p) => p.x)) + Math.max(...labelPoints.map((p) => p.x))) / 2;
      const centerZ = (Math.min(...labelPoints.map((p) => p.z)) + Math.max(...labelPoints.map((p) => p.z))) / 2;

      const flagHtml = group.settlement.flagUrl
        ? `<img src="${group.settlement.flagUrl}" style="width: 32px; height: 32px; object-fit: contain; margin-bottom: 4px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); border-radius: 4px;" /><br>`
        : '';
      const stateNameStr = group.settlement.state?.name || 'Независимый поселение';

      bordersData[`${group.settlement.id}_label`] = {
        type: 'html',
        html: `<div style="display: flex; flex-direction: column; align-items: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black; font-size: 14px; text-align: center; pointer-events: none; transform: translate(-50%, -50%);">${flagHtml}<div>${group.settlement.name}</div><div style="font-size: 11px; color: #ccc;">${stateNameStr}</div></div>`,
        position: { x: centerX, y: labelMaxY + 10, z: centerZ },
        anchor: { x: 0.5, y: 0.5 },
        classes: [],
        listed: false,
      };
    });

    Object.values(stateGroups).forEach((group) => {
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
        const hull = this.getConcaveHull(points, 2);
        if (hull.length < 3) return;

        let r, g, b;
        if (group.state.color && /^#([0-9A-F]{3}){1,2}$/i.test(group.state.color)) {
          const hex = group.state.color;
          r = parseInt(hex.length === 4 ? hex.slice(1, 2).repeat(2) : hex.slice(1, 3), 16);
          g = parseInt(hex.length === 4 ? hex.slice(2, 3).repeat(2) : hex.slice(3, 5), 16);
          b = parseInt(hex.length === 4 ? hex.slice(3, 4).repeat(2) : hex.slice(5, 7), 16);
        } else {
          const stateName = group.state.name;
          let hash = 0;
          for (let i = 0; i < stateName.length; i++) hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
          let hexColor = '#';
          for (let i = 0; i < 3; i++) hexColor += ('00' + ((hash >> (i * 8)) & 0xff).toString(16)).substr(-2);
          r = parseInt(hexColor.slice(1, 3), 16) || 255;
          g = parseInt(hexColor.slice(3, 5), 16) || 0;
          b = parseInt(hexColor.slice(5, 7), 16) || 0;
        }

        stateBordersData[`${group.state.id}_border_${index}`] = {
          type: 'extrude',
          position: { x: hull[0].x, y: (minY + maxY) / 2, z: hull[0].z },
          shape: hull,
          shapeMinY: minY,
          shapeMaxY: maxY,
          fillColor: { r, g, b, a: 0.02 }, // ОЧЕНЬ слабая заливка для всего государства
          lineColor: { r, g, b, a: 1.0 },
          depthTestEnabled: false,
          listed: false,
        };
      });

      const labelPoints: { x: number; z: number }[] = [];
      let labelMaxY = -Infinity;
      largestCluster.forEach((hullObj) => {
        labelPoints.push(...hullObj.points);
        if (hullObj.maxY > labelMaxY) labelMaxY = hullObj.maxY;
      });

      const emblemUrl = group.state.coatOfArmsUrl || group.state.flagUrl;
      const flagHtml = emblemUrl
        ? `<img src="${emblemUrl}" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 4px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5)); border-radius: 4px;" /><br>`
        : '';

      const centerX = (Math.min(...labelPoints.map((p) => p.x)) + Math.max(...labelPoints.map((p) => p.x))) / 2;
      const centerZ = (Math.min(...labelPoints.map((p) => p.z)) + Math.max(...labelPoints.map((p) => p.z))) / 2;

      stateBordersData[`${group.state.id}_label`] = {
        type: 'html',
        html: `<div style="display: flex; flex-direction: column; align-items: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black; font-size: 18px; text-align: center; pointer-events: none; transform: translate(-50%, -50%);">${flagHtml}<div>${group.state.name}</div></div>`,
        position: { x: centerX, y: labelMaxY + 30, z: centerZ },
        anchor: { x: 0.5, y: 0.5 },
        classes: [],
        listed: false,
      };
    });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalMarkers: Record<string, any> = {};
    try {
      // Пытаемся получить оригинальные маркеры (игроки, точки), чтобы не стереть их
      const res = await fetch(`http://minecraft_server:8100/maps/${mapName}/live/markers.json`);
      if (res.ok) {
        originalMarkers = await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch original BlueMap markers', e);
    }

    originalMarkers['settlement_zones_layer'] = {
      label: 'Приваты (зоны)',
      toggleable: true,
      defaultHidden: true,
      defaultHide: true,
      markers: markersData,
    };

    originalMarkers['settlement_borders_layer_v2'] = {
      label: 'Границы поселений',
      toggleable: true,
      defaultHidden: true,
      defaultHide: true,
      markers: bordersData,
    };

    originalMarkers['state_borders_layer'] = {
      label: 'Границы государств',
      toggleable: true,
      defaultHide: false,
      markers: stateBordersData,
    };

    this.blueMapMarkersCache[mapName] = originalMarkers;
    this.blueMapMarkersCacheTime[mapName] = now;
    return originalMarkers;
  }
}
