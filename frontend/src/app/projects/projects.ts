import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '../material/material-module';
import { MatOptionModule } from '@angular/material/core';
import { AuthService } from '../auth/auth.service';

interface Project {
  id: number;
  name: string;
  shortname: string;
  manager_id?: number;
}

interface Person {
  id: number;
  firstname: string;
  lastname: string;
}

function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value?.trim().length > 0 ? null : { blank: true };
}

@Component({
  selector: 'app-projects',
  imports: [ReactiveFormsModule, MaterialModule, MatOptionModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css'
})
export class Projects implements OnInit, OnDestroy {
  form = new FormGroup({
    name: new FormControl('', [notBlank]),
    shortname: new FormControl('', [notBlank]),
    manager_id: new FormControl<number | null>(null),
  });

  paginationForm = new FormGroup({
    offset: new FormControl(0),
    limit: new FormControl(10),
    filter: new FormControl(''),
  });

  dataSource = new MatTableDataSource<Project>();
  displayedColumns = ['id', 'name', 'shortname', 'manager_id'];
  editingId: number | null = null;
  filtered: number = 0;
  total: number = 0;
  persons: Person[] = [];

  private paginationSub!: Subscription;

  protected auth = inject(AuthService);

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadPersons();
    this.loadData();
    this.paginationSub = this.paginationForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => a.offset === b.offset && a.limit === b.limit && a.filter === b.filter),
    ).subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.paginationSub.unsubscribe();
  }

  private formPayload() {
    const v = this.form.value;
    return {
      name: v.name,
      shortname: v.shortname,
      manager_id: v.manager_id || undefined,
    };
  }

  loadPersons(): void {
    this.http.get('/api/person', { params: { offset: 0, limit: 1000 } }).subscribe({
      next: (res) => {
        this.persons = (res as any).data as Person[];
      },
      error: (e) => {
        this.snackBar.open('Błąd wczytywania listy osób', 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-error'
        });
      }
    });
  }

  loadData(): void {
    const { offset, limit, filter } = this.paginationForm.value;
    const params: Record<string, any> = { offset: offset ?? 0, limit: limit ?? 10 };
    if (filter) params['filter'] = filter;
    this.http.get('/api/project', { params }).subscribe({
      next: (res) => {
        this.dataSource.data = (res as any).data as Project[];
        this.filtered = (res as any).filtered;
        this.total = (res as any).total;
      },
      error: (e) => {
        this.snackBar.open(JSON.stringify(e.error), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-error'
        });
      }
    });
  }

  selectRow(project: Project): void {
    this.editingId = project.id;
    this.form.setValue({
      name: project.name,
      shortname: project.shortname,
      manager_id: project.manager_id ?? null,
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form.reset();
  }

  delete(): void {
    this.http.delete(`/api/project`, { params: { id: this.editingId! } }).subscribe({
      next: (res) => {
        this.cancel();
        this.loadData();
        this.snackBar.open(JSON.stringify(res), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-success'
        });
      },
      error: (e) => {
        this.snackBar.open(JSON.stringify(e.error), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-error'
        });
      }
    });
  }

  modify(): void {
    this.http.put('/api/project', { id: this.editingId, ...this.formPayload() }).subscribe({
      next: (res) => {
        this.cancel();
        this.loadData();
        this.snackBar.open(JSON.stringify(res), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-success'
        });
      },
      error: (e) => {
        this.snackBar.open(JSON.stringify(e.error), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-error'
        });
      }
    });
  }

  post(): void {
    this.http.post('/api/project', this.formPayload()).subscribe({
      next: (res) => {
        this.loadData();
        this.form.reset();
        this.snackBar.open(JSON.stringify(res), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-success'
        });
      },
      error: (e) => {
        this.snackBar.open(JSON.stringify(e.error), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-error'
        });
      }
    });
  }

  getManagerName(managerId?: number): string {
    if (!managerId) return '';
    const person = this.persons.find(p => p.id === managerId);
    return person ? `${person.firstname} ${person.lastname}` : '';
  }
}