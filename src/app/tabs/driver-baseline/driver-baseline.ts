import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-driver-baseline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="driver-shell">
      <header class="header">
        <h2>Driver Baseline</h2>
        <p>Baseline performance metrics by driver</p>
      </header>

      <section class="card">
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Seniority</th>
              <th>Bid Route</th>
              <th>Avg Stops</th>
              <th>Avg Miles</th>
              <th>Avg SPM</th>
              <th>Avg NDPPH</th>
              <th>Avg Ov/Un</th>
              <th>AM / PM</th>
            </tr>
          </thead>

          <tbody>
            <ng-container *ngFor="let d of drivers$ | async">
              <!-- BASE ROW -->
              <tr>
                <td
                  class="driver clickable"
                  (click)="toggleDriver(d.driverId)">
                  {{ d.name }}
                </td>

                <td>{{ d.seniority }}</td>
                <td>{{ d.bidRoute }}</td>
                <td>{{ d.avgStops }}</td>
                <td>{{ d.avgMiles }}</td>
                <td>{{ d.avgSPM }}</td>

                <!-- NDPPH WITH BAR -->
                <td>
                  <div class="metric-cell">
                    <span class="metric-value">{{ d.avgNDPPH }}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [ngClass]="{
                          'bar-good': d.avgNDPPH >= 26,
                          'bar-warn': d.avgNDPPH >= 23 && d.avgNDPPH < 26,
                          'bar-bad': d.avgNDPPH < 23
                        }"
                        [style.width.%]="Math.min((d.avgNDPPH / 30) * 100, 100)">
                      </div>
                    </div>
                  </div>
                </td>

                <!-- OV/UN WITH BAR -->
                <td>
                  <div class="metric-cell">
                    <span class="metric-value">{{ d.avgOvUn }}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [ngClass]="{
                          'bar-good': d.avgOvUn <= -0.2,
                          'bar-warn': d.avgOvUn > -0.2 && d.avgOvUn <= 0.2,
                          'bar-bad': d.avgOvUn > 0.2
                        }"
                        [style.width.%]="Math.min(Math.abs(d.avgOvUn) * 50, 100)">
                      </div>
                    </div>
                  </div>
                </td>

                <td>{{ d.amPmSplit }}</td>
              </tr>

              <!-- DRILL DOWN -->
              <tr *ngIf="expandedDriverId === d.driverId">
                <td colspan="9" class="drill">
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
                          <tr *ngFor="let r of getDailyForDriver(d.driverId)">
                            <td>{{ r.date }}</td>
                            <td>{{ r.dayOfWeek }}</td>
                            <td>{{ r.stops }}</td>
                            <td>{{ r.miles }}</td>
                            <td>{{ r.ndpph }}</td>
                            <td>{{ r.paidVsPlan }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- SPARKLINES -->
                    <div>
                      <h4>NDPPH Trend</h4>
                      <svg width="220" height="60">
                        <polyline
                          [attr.points]="sparkline(d.driverId, 'ndpph')"
                          fill="none"
                          stroke="#351c15"
                          stroke-width="2" />
                      </svg>

                      <h4>Stops Trend</h4>
                      <svg width="220" height="60">
                        <polyline
                          [attr.points]="sparkline(d.driverId, 'stops')"
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
    .driver-shell { background: #ffffff; }

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

    .driver {
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
export class DriverBaselineComponent {
  readonly Math = Math;

  private dataService = inject(DataService);

  expandedDriverId: string | null = null;
  private dailyCache: any[] = [];

  constructor() {
    this.dataService.data$.subscribe(d => {
      this.dailyCache = d?.dailyHistory ?? [];
    });
  }

  toggleDriver(id: string) {
    this.expandedDriverId = this.expandedDriverId === id ? null : id;
  }

  getDailyForDriver(driverId: string) {
    return this.dailyCache.filter(d => d.driverId === driverId);
  }

  sparkline(driverId: string, field: 'ndpph' | 'stops') {
    const rows = this.getDailyForDriver(driverId);
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

  drivers$ = combineLatest([
    this.dataService.data$,
    this.dataService.viewConfig$
  ]).pipe(
    map(([data, config]) => {
      if (!data) return [];

      const byId = new Map(
        data.drivers.map((d: any) => [d.driverId, d])
      );

      if (!config.date && !config.dayOfWeek) {
        return data.driverBaselines.map((b: any) => {
          const meta: any = byId.get(b.driverId) || {};
          return { ...b, ...meta };
        });
      }

      let filtered = data.dailyHistory;
      if (config.date) {
        filtered = filtered.filter((d: any) => d.date === config.date);
      } else if (config.dayOfWeek) {
        filtered = filtered.filter(
          (d: any) => d.dayOfWeek === config.dayOfWeek
        );
      }

      const grouped = new Map<string, any[]>();
      filtered.forEach((d: any) => {
        if (!grouped.has(d.driverId)) grouped.set(d.driverId, []);
        grouped.get(d.driverId)!.push(d);
      });

      return Array.from(grouped.entries()).map(([id, rows]) => {
        const meta: any = byId.get(id) || {};
        return {
          driverId: id,
          name: meta.name,
          seniority: meta.seniority,
          bidRoute: meta.bidRoute,
          avgStops: Math.round(rows.reduce((s, r) => s + r.stops, 0) / rows.length),
          avgMiles: Math.round(rows.reduce((s, r) => s + r.miles, 0) / rows.length),
          avgSPM: +(rows.reduce((s, r) => s + r.stops, 0) /
            rows.reduce((s, r) => s + r.miles, 0)).toFixed(2),
          avgNDPPH: +(rows.reduce((s, r) => s + r.ndpph, 0) / rows.length).toFixed(1),
          avgOvUn: +(rows.reduce((s, r) => s + r.paidVsPlan, 0) / rows.length).toFixed(2),
          amPmSplit: meta.amPmSplit ?? '—'
        };
      });
    })
  );
}
