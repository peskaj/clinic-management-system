import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from '../material/material-module';

interface Person {
  id: number;
  firstname: string;
  lastname: string;
}

function notBlank(control: AbstractControl): ValidationErrors | null {
  return control.value?.trim().length > 0 ? null : { blank: true };
}

@Component({
  selector: 'app-persons',
  imports: [ReactiveFormsModule, MaterialModule],
  templateUrl: './persons.html',
  styleUrl: './persons.css'
})
export class Persons implements OnInit {
  form = new FormGroup({
    firstname: new FormControl('', [notBlank]),
    lastname: new FormControl('', [notBlank]),
  });

  dataSource = new MatTableDataSource<Person>();
  displayedColumns = ['id', 'firstname', 'lastname'];
  editingId: number | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get('/api/person').subscribe({
      next: (res) => {
        this.dataSource.data = res as Person[];
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
    this.form.setValue({ firstname: person.firstname, lastname: person.lastname });
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
    this.http.put('/api/person', { id: this.editingId, ...this.form.value }).subscribe({
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
    this.http.post('/api/person', this.form.value).subscribe({
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
