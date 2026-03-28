import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '../material/material-module';

interface Person {
  id: number;
  firstname: string;
  lastname: string;
  email?: string;
  birthdate?: string;
}

function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value?.trim().length > 0 ? null : { blank: true };
}

function optionalEmail(control: AbstractControl): ValidationErrors | null {
  if (!control.value || control.value.trim() === '') return null;
  return Validators.email(control);
}

@Component({
  selector: 'app-persons',
  imports: [ReactiveFormsModule, MaterialModule],
  templateUrl: './persons.html',
  styleUrl: './persons.css'
})
export class Persons implements OnInit, OnDestroy {
  form = new FormGroup({
    firstname: new FormControl('', [notBlank]),
    lastname: new FormControl('', [notBlank]),
    email: new FormControl('', [optionalEmail]),
    birthdate: new FormControl<Date | null>(null),
  });

  paginationForm = new FormGroup({
    offset: new FormControl(0),
    limit: new FormControl(10),
  });

  dataSource = new MatTableDataSource<Person>();
  displayedColumns = ['id', 'firstname', 'lastname', 'email', 'birthdate'];
  editingId: number | null = null;
  count: number = 0;

  private paginationSub!: Subscription;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadData();
    this.paginationSub = this.paginationForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => a.offset === b.offset && a.limit === b.limit),
    ).subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.paginationSub.unsubscribe();
  }

  private toISODate(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formPayload() {
    const v = this.form.value;
    return {
      firstname: v.firstname,
      lastname: v.lastname,
      email: v.email || undefined,
      birthdate: this.toISODate(v.birthdate ?? null) ?? undefined,
    };
  }

  loadData(): void {
    const { offset, limit } = this.paginationForm.value;
    this.http.get('/api/person', { params: { offset: offset ?? 0, limit: limit ?? 10 } }).subscribe({
      next: (res) => {
        this.dataSource.data = (res as any).data as Person[];
        this.count = (res as any).count;
      },
      error: (e) => {
        this.snackBar.open(JSON.stringify(e.error), 'Zamknij', {
          duration: 5000,
          panelClass: 'snackbar-error'
        });
      }
    });
  }

  selectRow(person: Person): void {
    this.editingId = person.id;
    this.form.setValue({
      firstname: person.firstname,
      lastname: person.lastname,
      email: person.email ?? '',
      birthdate: person.birthdate ? new Date(person.birthdate) : null,
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form.reset();
  }

  delete(): void {
    this.http.delete(`/api/person`, { params: { id: this.editingId! } }).subscribe({
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
    this.http.put('/api/person', { id: this.editingId, ...this.formPayload() }).subscribe({
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
    this.http.post('/api/person', this.formPayload()).subscribe({
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
}
