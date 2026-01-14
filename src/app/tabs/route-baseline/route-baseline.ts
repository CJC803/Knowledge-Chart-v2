import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-route-baseline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="route-shell">
      <header class="header">
        <h2>Route Baseline</h2>
        <p>Baseline performance metrics by route</p>
      </header>

      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Avg Stops</th>
              <th>Avg Miles</th>
              <th>Avg SPM</th>
              <th>Avg NDPPH</th>
              <th>Avg Ov/Un</th>
            </tr>
          </thead>

          <tbody>
            <ng-container *ngFor="let r of routes$ | async">
              <!-- BASE ROW -->
              <tr>
                <td
                  class="route clickable"
                  (click)="toggleRoute(r.routeId)">
                  {{ r.routeId }}
                </td>

                <td>{{ r.avgStops }}</td>
                <td>{{ r.avgMiles }}</td>
                <td>{{ r.avgSPM }}</td>

                <!-- NDPPH WITH BAR -->
                <td>
                  <div class="metric-cell">
                    <span class="metric-value">{{ r.avgNDPPH }}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [ngClass]="{
                          'bar-good': r.avgNDPPH >= 26,
                          'bar-warn': r.avgNDPPH >= 23 && r.avgNDPPH < 26,
                          'bar-bad': r.avgNDPPH < 23
                        }"
                        [style.width.%]="Math.min((r.avgNDPPH / 30) * 100, 100)">
                      </div>
                    </div>
                  </div>
                </td>

                <!-- OV/UN WITH BAR -->
                <td>
                  <div class="metric-cell">
                    <span class="metric-value">{{ r.avgOvUn }}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [ngClass]="{
                          'bar-good': r.avgOvUn <= -0.2,
                          'bar-warn': r.avgOvUn > -0.2 && r.avgOvUn <= 0.2,
                          'bar-bad': r.avgOvUn > 0.2
                        }"
                        [style.width.%]="Math.min(Math.abs(r.avgOvUn) * 50, 100)">
                      </div>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- DRILL DOWN -->
              <tr *ngIf="expandedRouteId === r.routeId">
                <td colspan="6" class="drill">
                  <div class="drill-grid">
                    <!-- DAILY TABLE -->
                    <div>
                      <h4>Daily Performance</h4>
                      <table class="inner">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>DOW</th>
                            <th>Stops</th>
                            <th>Miles</th>
                            <th>NDPPH</th>
                            <th>Ov/Un</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let d of getDailyForRoute(r.routeId)">
                            <td>{{ d.date }}</td>
                            <td>{{ d.dayOfWeek }}</td>
                            <td>{{ d.stops }}</td>
                            <td>{{ d.miles }}</td>
                            <td>{{ d.ndpph }}</td>
                            <td>{{ d.paidVsPlan }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- SPARKLINES -->
                    <div>
                      <h4>NDPPH Trend</h4>
                      <svg width="220" height="60">
                        <polyline
                          [attr.points]="sparkline(r.routeId, 'ndpph')"
                          fill="none"
                          stroke="#351c15"
                          stroke-width="2" />
                      </svg>

                      <h4>Stops Trend</h4>
                      <svg width="220" height="60">
                        <polyline
                          [attr.points]="sparkline(r.routeId, 'stops')"
                          fill="none"
                          stroke="#ffb500"
                          stroke-width="2" />
                      </svg>
                    </div>
                  </div>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </section>
    </section>
  `,
  styles: [`
    .route-shell { background: #ffffff; }

    .header h2 {
      margin: 0;
      color: #351c15;
      font-size: 20px;
      font-weight: 700;
    }

    .header p {
      margin: 4px 0 16px;
      color: #666;
      font-size: 13px;
    }

    .card {
      background: #f7f7f7;
      border-left: 6px solid #ffb500;
      padding: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    th {
      background: #351c15;
      color: white;
      padding: 10px 8px;
      font-size: 13px;
      font-weight: 600;
    }

    td {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 13px;
      vertical-align: top;
    }

    tbody tr:hover {
      background: #fff8e1;
    }

    .route {
      font-weight: 600;
      color: #351c15;
    }

    .clickable {
      cursor: pointer;
      text-decoration: underline;
    }

    /* INLINE BAR VISUALS */
    .metric-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-value {
      font-size: 13px;
      font-weight: 600;
    }

    .bar-track {
      height: 6px;
      background: #e6e6e6;
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
    }

    .bar-good { background: #2e7d32; }
    .bar-warn { background: #f9a825; }
    .bar-bad  { background: #c62828; }

    /* DRILL DOWN */
    .drill {
      background: #fafafa;
      padding: 16px;
    }

    .drill-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    .inner {
      width: 100%;
      font-size: 12px;
    }

    .inner th {
      background: #eee;
      color: #351c15;
    }

    h4 {
      margin: 0 0 8px;
      font-size: 13px;
      color: #351c15;
    }
  `]
})
export class RouteBaselineComponent {
  readonly Math = Math;
  
  private dataService = inject(DataService);

  expandedRouteId: string | null = null;
  private dailyCache: any[] = [];

  constructor() {
    this.dataService.data$.subscribe(d => {
      this.dailyCache = d?.dailyHistory ?? [];
    });
  }

  toggleRoute(id: string) {
    this.expandedRouteId = this.expandedRouteId === id ? null : id;
  }

  getDailyForRoute(routeId: string) {
    return this.dailyCache.filter(d => d.routeId === routeId);
  }

  sparkline(routeId: string, field: 'ndpph' | 'stops') {
    const rows = this.getDailyForRoute(routeId);
    if (!rows.length) return '';

    const values = rows.map(r => r[field]);
    const max = Math.max(...values);
    const min = Math.min(...values);

    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 200 + 10;
        const y = 50 - ((v - min) / (max - min || 1)) * 40;
        return `${x},${y}`;
      })
      .join(' ');
  }

  routes$ = combineLatest([
    this.dataService.data$,
    this.dataService.viewConfig$
  ]).pipe(
    map(([data, config]) => {
      if (!data) return [];

      if (!config.date && !config.dayOfWeek) {
        return data.routeBaselines;
      }

      let filtered = data.dailyHistory;

      if (config.date) {
        filtered = filtered.filter((d: any) => d.date === config.date);
      } else if (config.dayOfWeek) {
        filtered = filtered.filter(
          (d: any) => d.dayOfWeek === config.dayOfWeek
        );
      }

      const byRoute = new Map<string, any[]>();
      filtered.forEach((d: any) => {
        if (!byRoute.has(d.routeId)) byRoute.set(d.routeId, []);
        byRoute.get(d.routeId)!.push(d);
      });

      return Array.from(byRoute.entries()).map(([routeId, rows]) => {
        const avgStops =
          rows.reduce((s, r) => s + r.stops, 0) / rows.length;

        const avgMiles =
          rows.reduce((s, r) => s + r.miles, 0) / rows.length;

        const avgSPM = avgStops / avgMiles;

        const avgNDPPH =
          rows.reduce((s, r) => s + r.ndpph, 0) / rows.length;

        const avgOvUn =
          rows.reduce((s, r) => s + r.paidVsPlan, 0) / rows.length;

        return {
          routeId,
          avgStops: Math.round(avgStops),
          avgMiles: Math.round(avgMiles),
          avgSPM: +avgSPM.toFixed(2),
          avgNDPPH: +avgNDPPH.toFixed(1),
          avgOvUn: +avgOvUn.toFixed(2)
        };
      });
    })
  );
}
