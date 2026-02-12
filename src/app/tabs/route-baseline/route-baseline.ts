import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-route-baseline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-baseline.html',
  styleUrls: ['./route-baseline.scss'],
})
export class RouteBaselineComponent {
  readonly Math = Math;

  private dataService = inject(DataService);

  expandedRouteId: string | null = null;
  private dailyCache: any[] = [];

  selectedRouteIds: string[] = [];
  showCompare = true;

  toggleSelectRoute(routeId: string) {
    const idx = this.selectedRouteIds.indexOf(routeId);

    if (idx >= 0) {
      this.selectedRouteIds = this.selectedRouteIds.filter(id => id !== routeId);
      return;
    }

    // limit to 2 for demo
    if (this.selectedRouteIds.length >= 2) {
      this.selectedRouteIds = [this.selectedRouteIds[1], routeId];
    } else {
      this.selectedRouteIds = [...this.selectedRouteIds, routeId];
    }
  }

  isSelectedRoute(routeId: string) {
    return this.selectedRouteIds.includes(routeId);
  }

  get compareReady() {
    return this.selectedRouteIds.length === 2;
  }


  constructor() {
    this.dataService.data$.subscribe((d) => {
      this.dailyCache = d?.dailyHistory ?? [];
    });
  }

  toggleRoute(id: string) {
    this.expandedRouteId = this.expandedRouteId === id ? null : id;
  }

  getDailyForRoute(routeId: string) {
    return this.dailyCache.filter((d) => d.routeId === routeId);
  }

  sparkline(routeId: string, field: 'ndpph' | 'stops') {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return '';

    const values = rows.map((r) => r[field]);
    const max = Math.max(...values);
    const min = Math.min(...values);

    return values
      .map((v, i) => {
        const x = (i / (values.length - 1 || 1)) * 200 + 10;
        const y = 50 - ((v - min) / (max - min || 1)) * 40;
        return `${x},${y}`;
      })
      .join(' ');
  }

  routes$ = combineLatest([this.dataService.data$, this.dataService.viewConfig$]).pipe(
    map(([data, config]) => {
      if (!data) return [];

      if (!config?.date && !config?.dayOfWeek) {
        return data.routeBaselines ?? [];
      }

      let filtered = data.dailyHistory ?? [];

      if (config.date) {
        filtered = filtered.filter((d: any) => d.date === config.date);
      } else if (config.dayOfWeek) {
        filtered = filtered.filter((d: any) => d.dayOfWeek === config.dayOfWeek);
      }

      const byRoute = new Map<string, any[]>();
      filtered.forEach((d: any) => {
        if (!byRoute.has(d.routeId)) byRoute.set(d.routeId, []);
        byRoute.get(d.routeId)!.push(d);
      });

      return Array.from(byRoute.entries()).map(([routeId, rows]) => {
        const avgStops = rows.reduce((s, r) => s + r.stops, 0) / rows.length;
        const avgMiles = rows.reduce((s, r) => s + r.miles, 0) / rows.length;

        const avgSPM = avgStops / (avgMiles || 1);
        const avgNDPPH = rows.reduce((s, r) => s + r.ndpph, 0) / rows.length;
        const avgOvUn = rows.reduce((s, r) => s + r.paidVsPlan, 0) / rows.length;

        return {
          routeId,
          avgStops: Math.round(avgStops),
          avgMiles: Math.round(avgMiles),
          avgSPM: +avgSPM.toFixed(2),
          avgNDPPH: +avgNDPPH.toFixed(1),
          avgOvUn: +avgOvUn.toFixed(2),
        };
      });
    })
  );
}
