import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface DecadeCount {
  count: number;
  decade: number;
}

@Component({
  selector: 'app-stats',
  imports: [],
  templateUrl: './stats.html',
  styleUrl: './stats.css'
})
export class Stats implements OnInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  protected auth = inject(AuthService);
  histogram: DecadeCount[] = [];
  chart?: Chart;
  totalCount: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get('/api/person/histogram').subscribe({
      next: (res) => {
        this.histogram = res as DecadeCount[];
        this.totalCount = this.histogram.reduce((sum, h) => sum + h.count, 0);
        this.createChart();
      },
      error: (_e) => {}
    });
  }

  createChart(): void {
    if (!this.chartCanvas || this.histogram.length === 0) return;

    // Zniszcz poprzedni wykres jeśli istnieje
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.histogram.map(h => `${h.decade}–${h.decade + 9}`);
    const data = this.histogram.map(h => h.count);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Liczba osób',
          data: data,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(118, 75, 162, 0.9)',
          hoverBorderColor: 'rgba(118, 75, 162, 1)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Rozkład osób według dekady urodzenia',
            font: {
              size: 20,
              weight: 'bold'
            },
            padding: 20,
            color: '#1a1a1a'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                if (value === null || value === undefined) return '';
                const percentage = ((value / this.totalCount) * 100).toFixed(1);
                return `Liczba osób: ${value} (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            title: {
              display: true,
              text: 'Liczba osób',
              font: {
                size: 13,
                weight: 'bold'
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              display: false
            },
            title: {
              display: true,
              text: 'Dekada urodzenia',
              font: {
                size: 13,
                weight: 'bold'
              }
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    };

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
